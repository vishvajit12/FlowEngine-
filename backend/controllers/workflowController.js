const WorkflowDefinition = require('../models/WorkflowDefinition');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listWorkflows = asyncHandler(async (req, res) => {
  const workflows = await WorkflowDefinition.find({ userId: req.user._id }).select('name updatedAt createdAt').sort('-updatedAt');
  res.status(200).json({ success: true, data: { workflows } });
});

const getWorkflow = asyncHandler(async (req, res) => {
  const workflow = await WorkflowDefinition.findOne({ _id: req.params.id, userId: req.user._id });
  if (!workflow) throw new ApiError(404, 'Workflow not found');
  res.status(200).json({ success: true, data: { workflow } });
});

const createWorkflow = asyncHandler(async (req, res) => {
  const { name, nodes, edges } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const workflow = await WorkflowDefinition.create({ userId: req.user._id, name, nodes: nodes || [], edges: edges || [] });
  res.status(201).json({ success: true, data: { workflow } });
});

const updateWorkflow = asyncHandler(async (req, res) => {
  const { name, nodes, edges } = req.body;
  const workflow = await WorkflowDefinition.findOne({ _id: req.params.id, userId: req.user._id });
  if (!workflow) throw new ApiError(404, 'Workflow not found');
  if (name !== undefined) workflow.name = name;
  if (nodes !== undefined) workflow.nodes = nodes;
  if (edges !== undefined) workflow.edges = edges;
  workflow.version += 1;
  await workflow.save();
  res.status(200).json({ success: true, data: { workflow } });
});

const deleteWorkflow = asyncHandler(async (req, res) => {
  const workflow = await WorkflowDefinition.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!workflow) throw new ApiError(404, 'Workflow not found');
  res.status(200).json({ success: true, data: null });
});

module.exports = { listWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow };
