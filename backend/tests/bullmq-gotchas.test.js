require('./setup-env');
const test = require('node:test');
const assert = require('node:assert');
const { Queue, Worker, Job, QueueEvents } = require('bullmq');
const connection = require('../config/redis');

// Every case here is a real bug this project hit during development,
// not a hypothetical -- see the reasoning left in runtime/engine.js
// and runtime/replay.js at each corresponding line. These tests exist
// so a future change can't silently reintroduce any of them.

test('BullMQ rejects a colon in a custom jobId', async () => {
  const queue = new Queue('test-jobid-colon', { connection });
  await assert.rejects(
    () => queue.add('job', {}, { jobId: 'exec123:node1' }),
    /cannot contain/i,
    'expected BullMQ to reject a colon-containing custom jobId'
  );
  await queue.close();
});

test('BullMQ accepts an underscore-separated jobId', async () => {
  const queue = new Queue('test-jobid-underscore', { connection });
  const job = await queue.add('job', {}, { jobId: 'exec123_node1' });
  assert.strictEqual(job.id, 'exec123_node1');
  await queue.close();
});

test('re-adding a job under an already-used jobId silently no-ops, does not throw', async () => {
  const queueName = 'test-jobid-reuse';
  const jobId = `dup-id-${Date.now()}`; // unique per run -- a fixed ID here would make THIS test vulnerable to the exact bug it's testing for, if a prior run left state behind
  const queue = new Queue(queueName, { connection });
  const worker = new Worker(queueName, async () => ({ attempt: 1 }), { connection });

  await queue.add('job', {}, { jobId });
  await new Promise((r) => setTimeout(r, 500));

  // This must NOT throw -- but it also must NOT create a second job or
  // reset the first one. This is exactly why retryExecution/replayNode
  // generate a fresh timestamped jobId instead of reusing the original.
  await assert.doesNotReject(() => queue.add('job', {}, { jobId }));

  const job = await Job.fromId(queue, jobId);
  const state = await job.getState();
  assert.strictEqual(state, 'completed', 'the original job should be untouched by the no-op re-add');

  await worker.close();
  await queue.close();
});

test('Job.fromId returns undefined for a jobId that was never added', async () => {
  const queue = new Queue('test-jobid-missing', { connection });
  const job = await Job.fromId(queue, `never-existed-${Date.now()}`);
  assert.strictEqual(job, undefined);
  await queue.close();
});

test('QueueEvents "failed" fires exactly once, only after all retry attempts are exhausted', async () => {
  const queueName = `test-retry-semantics-${Date.now()}`; // unique queue per run, not just jobId -- avoids any cross-run listener/state bleed
  const queue = new Queue(queueName, { connection });
  const queueEvents = new QueueEvents(queueName, { connection });
  await queueEvents.waitUntilReady();

  const worker = new Worker(queueName, async () => {
    throw new Error('always fails');
  }, { connection });
  await worker.waitUntilReady();

  let failedCount = 0;
  queueEvents.on('failed', () => { failedCount++; });

  await queue.add('job', {}, { jobId: 'always-fails', attempts: 3, backoff: { type: 'fixed', delay: 200 } });
  await new Promise((r) => setTimeout(r, 2500));

  assert.strictEqual(failedCount, 1, "QueueEvents 'failed' should fire exactly once, not once per attempt");

  await worker.close();
  await queueEvents.close();
  await queue.close();
});

