/**
 * This is what "event sourcing" actually means, made concrete: state
 * is a pure fold/reduce over the immutable event log, not a value read
 * out of a cached field. WorkflowExecution.status/currentNodeId DO
 * exist as denormalized fields for fast queries (list views, etc.) --
 * but this function proves those fields are a PROJECTION of the
 * events, not the other way around, by deriving the same answer
 * independently, purely from events[].
 *
 * Also this is what makes Node Replay's history-preservation work for
 * free: if a node has two NodeCompleted events (an original run and a
 * later replay), both stay in the raw event array untouched -- this
 * fold just happens to let the later one win for "what's current,"
 * because it's a later iteration of the same reduce. Nothing was
 * overwritten to achieve that.
 */
function reconstructState(events) {
  const state = {
    status: 'RUNNING',
    completedNodeIds: [],
    completedNodeOutputs: {},
    currentNodeId: null,
    failedNodeId: null,
    failureReason: null,
  };

  for (const event of events) {
    switch (event.type) {
      case 'WorkflowStarted':
        state.status = 'RUNNING';
        break;

      case 'NodeQueued':
        // A replay's NodeQueued shouldn't move currentNodeId -- it's an
        // isolated re-run, not the workflow progressing to a new node.
        // Without this check, replaying an earlier node after the
        // workflow already COMPLETED would leave currentNodeId pointing
        // at that node, which reads as "still waiting on this" even
        // though status is COMPLETED and nothing is actually pending.
        if (!event.payload?.replay) {
          state.currentNodeId = event.nodeId;
        }
        break;

      case 'NodeCompleted':
        if (!state.completedNodeIds.includes(event.nodeId)) {
          state.completedNodeIds.push(event.nodeId);
        }
        state.completedNodeOutputs[event.nodeId] = event.payload; // later events naturally overwrite earlier ones here
        if (state.failedNodeId === event.nodeId) {
          state.failedNodeId = null;
          state.failureReason = null;
        }
        break;

      case 'NodeFailed':
        state.failedNodeId = event.nodeId;
        state.failureReason = event.payload?.reason || null;
        break;

      case 'WorkflowCompleted':
        state.status = 'COMPLETED';
        state.currentNodeId = null;
        break;

      case 'WorkflowFailed':
        state.status = 'FAILED';
        break;

      default:
        break; // unknown event types are ignored, not fatal -- forward compatible with future event types
    }
  }

  return state;
}

module.exports = reconstructState;
