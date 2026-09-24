const { Worker } = require('bullmq');
const connection = require('../config/redis');
const NodeFactory = require('../runtime/factory');

/**
 * Phase 4 gave this a hardcoded inline stub. Phase 5 replaces that with
 * the real Factory/Strategy pattern: the worker no longer knows or cares
 * what a "github" or "aitask" node does -- it asks the Factory for the
 * right Strategy and calls .execute(). The worker's own responsibility
 * stays exactly what the spec says it should be: receive a job, execute
 * one node, return the result. It still doesn't know about the DAG,
 * still doesn't decide what runs next -- that's the Runtime Engine's
 * job, reacting to this job's completion from a separate process.
 */
async function processStepJob(job) {
  const { executionId, userId, nodeId, nodeType, input } = job.data;
  console.log(`[Worker] Picked up job ${job.id} — node "${nodeId}" (${nodeType}) for execution ${executionId}`);

  const strategy = NodeFactory.create(nodeType);
  const result = await strategy.execute(input, { userId });

  return result;
}


const stepWorker = new Worker('step-execution', processStepJob, {
  connection,
  concurrency: 5, // process up to 5 jobs in parallel -- revisit once real node execution costs (API latency, etc.) are known
});

stepWorker.on('completed', (job, result) => {
  console.log(`[Worker] ✅ Job ${job.id} completed:`, result);
});

stepWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message);
});

module.exports = stepWorker;
