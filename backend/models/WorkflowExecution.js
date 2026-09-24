const mongoose = require('mongoose');

// Each event is immutable once written -- the array is only ever
// pushed to (see runtime/eventStore.js), never mutated in place.
// Event `type` is intentionally generic (NodeStarted, NodeCompleted...)
// rather than domain-specific (GeminiStarted, PDFGenerated...) --
// domain detail lives in `payload`. This is what lets the Runtime
// Engine stay ignorant of what a "github" or "aitask" node actually
// does; the event log doesn't hardcode integration names either.
const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'WorkflowStarted',
        'NodeQueued',
        'NodeStarted',
        'NodeCompleted',
        'NodeFailed',
        'WorkflowCompleted',
        'WorkflowFailed',
      ],
    },
    nodeId: { type: String, default: null }, // null for workflow-level events
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true } // each event keeps its own id -- useful later for replay position tracking
);

const workflowExecutionSchema = new mongoose.Schema(
  {
    workflowDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDefinition', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['RUNNING', 'COMPLETED', 'FAILED'],
      default: 'RUNNING',
    },
    currentNodeId: { type: String, default: null },
    events: { type: [eventSchema], default: [] }, // append-only -- see eventStore.append()
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The Replay Engine's `find({status:'RUNNING'})` runs on every single
// startup (Phase 6) -- without this index it's a full collection scan
// that gets slower as execution history grows, exactly when a fast
// recovery matters most. The compound form also covers analytics'
// per-user status counts (Phase 8) in the same index.
workflowExecutionSchema.index({ status: 1, userId: 1 });
// Powers the execution-history list filtered by workflow (Phase 8).
workflowExecutionSchema.index({ workflowDefinitionId: 1, startedAt: -1 });

module.exports = mongoose.model('WorkflowExecution', workflowExecutionSchema);

