const mongoose = require('mongoose');

const workflowDefinitionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    nodes: { type: Array, default: [] }, // React Flow nodes: {id, type, position, data}
    edges: { type: Array, default: [] }, // React Flow edges: {id, source, target}
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowDefinition', workflowDefinitionSchema);
