require('./setup-env');
const test = require('node:test');
const assert = require('node:assert');
const { getEntryNode, getNextNode } = require('../runtime/dagUtils');
const reconstructState = require('../runtime/reconstructState');

// Exact node/edge shape from the real GitHub Analyzer template
// (frontend/src/components/workflow/templates.js) -- not a simplified
// stand-in, so this test breaks if the two ever drift apart.
const nodes = [
  { id: 'n1', data: { nodeType: 'github' } },
  { id: 'n2', data: { nodeType: 'http' } },
  { id: 'n3', data: { nodeType: 'http' } },
  { id: 'n4', data: { nodeType: 'aitask' } },
  { id: 'n5', data: { nodeType: 'pdf' } },
  { id: 'n6', data: { nodeType: 'email' } },
];
const edges = [
  { id: 'e1', source: 'n1', target: 'n2' },
  { id: 'e2', source: 'n2', target: 'n3' },
  { id: 'e3', source: 'n3', target: 'n4' },
  { id: 'e4', source: 'n4', target: 'n5' },
  { id: 'e5', source: 'n5', target: 'n6' },
];

test('getEntryNode finds the node with no incoming edge', () => {
  assert.strictEqual(getEntryNode(nodes, edges).id, 'n1');
});

test('getNextNode walks the full chain in the correct order', () => {
  let current = 'n1';
  const order = [current];
  while (true) {
    const next = getNextNode(nodes, edges, current);
    if (!next) break;
    order.push(next.id);
    current = next.id;
  }
  assert.deepStrictEqual(order, ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
});

test('getNextNode returns null for the last node in the chain', () => {
  assert.strictEqual(getNextNode(nodes, edges, 'n6'), null);
});

test('reconstructState folds a normal completed run correctly', () => {
  const events = [
    { type: 'WorkflowStarted', nodeId: null, payload: {} },
    { type: 'NodeQueued', nodeId: 'n1', payload: {} },
    { type: 'NodeCompleted', nodeId: 'n1', payload: { ok: true } },
    { type: 'WorkflowCompleted', nodeId: null, payload: {} },
  ];
  const state = reconstructState(events);
  assert.strictEqual(state.status, 'COMPLETED');
  assert.deepStrictEqual(state.completedNodeIds, ['n1']);
});

test('reconstructState: a node replayed after completion does not duplicate in completedNodeIds', () => {
  const events = [
    { type: 'WorkflowStarted', nodeId: null, payload: {} },
    { type: 'NodeQueued', nodeId: 'n1', payload: {} },
    { type: 'NodeCompleted', nodeId: 'n1', payload: { message: 'first run' } },
    { type: 'WorkflowCompleted', nodeId: null, payload: {} },
    { type: 'NodeQueued', nodeId: 'n1', payload: { replay: true } },
    { type: 'NodeCompleted', nodeId: 'n1', payload: { message: 'replayed run' } },
  ];
  const state = reconstructState(events);
  assert.strictEqual(state.completedNodeIds.length, 1, 'should still list n1 exactly once');
  assert.strictEqual(state.completedNodeOutputs.n1.message, 'replayed run', 'latest replay should win as current');
  assert.strictEqual(state.status, 'COMPLETED', 'status must not revert because of a post-completion replay');
  assert.strictEqual(state.currentNodeId, null, "a replay's NodeQueued must not reopen currentNodeId");
});

test('reconstructState marks failure correctly and preserves the reason', () => {
  const events = [
    { type: 'WorkflowStarted', nodeId: null, payload: {} },
    { type: 'NodeQueued', nodeId: 'n1', payload: {} },
    { type: 'NodeFailed', nodeId: 'n1', payload: { reason: 'API timeout' } },
    { type: 'WorkflowFailed', nodeId: null, payload: {} },
  ];
  const state = reconstructState(events);
  assert.strictEqual(state.status, 'FAILED');
  assert.strictEqual(state.failedNodeId, 'n1');
  assert.strictEqual(state.failureReason, 'API timeout');
});

test('reconstructState clears a node failure after a successful retry', () => {
  const events = [
    { type: 'WorkflowStarted', nodeId: null, payload: {} },
    { type: 'NodeQueued', nodeId: 'n4', payload: {} },
    { type: 'NodeFailed', nodeId: 'n4', payload: { reason: 'Old model unavailable' } },
    { type: 'WorkflowFailed', nodeId: null, payload: { failedNodeId: 'n4' } },
    { type: 'NodeQueued', nodeId: 'n4', payload: { retry: true } },
    { type: 'NodeCompleted', nodeId: 'n4', payload: { output: 'analysis' } },
    { type: 'WorkflowCompleted', nodeId: null, payload: {} },
  ];
  const state = reconstructState(events);
  assert.strictEqual(state.status, 'COMPLETED');
  assert.strictEqual(state.failedNodeId, null);
  assert.strictEqual(state.failureReason, null);
});
