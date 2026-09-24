const WorkflowExecution = require('../models/WorkflowExecution');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const asyncHandler = require('../utils/asyncHandler');

// This is what Dashboard.jsx's two placeholder stat cards were
// literally waiting on -- the Phase 3 comment said "available after
// Phase 8" for a reason, not as a throwaway line.
const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [totalExecutions, completedExecutions, activeWorkflows] = await Promise.all([
    WorkflowExecution.countDocuments({ userId }),
    WorkflowExecution.countDocuments({ userId, status: 'COMPLETED' }),
    WorkflowDefinition.countDocuments({ userId }),
  ]);

  const successRate = totalExecutions === 0 ? null : Math.round((completedExecutions / totalExecutions) * 1000) / 10;

  res.status(200).json({
    success: true,
    data: { totalExecutions, successRate, activeWorkflows },
  });
});

const listExecutions = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.workflowId) filter.workflowDefinitionId = req.query.workflowId;

  const executions = await WorkflowExecution.find(filter)
    .select('workflowDefinitionId status startedAt completedAt')
    .sort('-startedAt')
    .limit(50);

  res.status(200).json({ success: true, data: { executions } });
});

module.exports = { getSummary, listExecutions };
