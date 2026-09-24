const WorkflowExecution = require('../models/WorkflowExecution');
const runtimeEngine = require('../runtime/engine');
const reconstructState = require('../runtime/reconstructState');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const runWorkflow = asyncHandler(async (req, res) => {
  const execution = await runtimeEngine.startExecution(req.params.id, req.user._id);
  res.status(202).json({ success: true, data: { execution } });
});

const getExecution = asyncHandler(async (req, res) => {
  const execution = await WorkflowExecution.findOne({ _id: req.params.id, userId: req.user._id }).populate(
    'workflowDefinitionId'
  );
  if (!execution) throw new ApiError(404, 'Execution not found');
  res.status(200).json({
    success: true,
    data: { execution, state: reconstructState(execution.events) },
  });
});

const downloadPdf = asyncHandler(async (req, res) => {
  const execution = await WorkflowExecution.findOne({ _id: req.params.id, userId: req.user._id }).select('events');
  if (!execution) throw new ApiError(404, 'Execution not found');

  const pdfEvent = [...execution.events].reverse().find((event) => event.payload?.pdfBase64);
  if (!pdfEvent) throw new ApiError(404, 'No generated PDF found for this execution');

  const filename = `${String(pdfEvent.payload.template || 'flowengine-report')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'flowengine-report'}.pdf`;
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(Buffer.from(pdfEvent.payload.pdfBase64, 'base64'));
});


const retryExecution = asyncHandler(async (req, res) => {
  try {
    const execution = await runtimeEngine.retryExecution(req.params.id, req.user._id);
    res.status(202).json({ success: true, data: { execution } });
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

const replayNode = asyncHandler(async (req, res) => {
  const { nodeId } = req.body;
  if (!nodeId) throw new ApiError(400, 'nodeId is required');
  try {
    const execution = await runtimeEngine.replayNode(req.params.id, nodeId, req.user._id);
    res.status(202).json({ success: true, data: { execution } });
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

module.exports = { runWorkflow, getExecution, downloadPdf, retryExecution, replayNode };
