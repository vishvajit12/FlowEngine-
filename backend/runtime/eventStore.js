const WorkflowExecution = require('../models/WorkflowExecution');

/**
 * The only place in the codebase that writes to WorkflowExecution.events.
 * Everything else (Runtime Engine now, Replay Engine in Phase 6) goes
 * through this module rather than pushing to the array directly.
 *
 * Uses an atomic $push via findByIdAndUpdate rather than the more
 * obvious "fetch execution, push to array in JS, .save()" pattern.
 * That fetch-modify-save shape has a real race condition: if two
 * events for the same execution get appended close together, the
 * second .save() can overwrite the first's change if it read the
 * document before the first write landed -- silently dropping an
 * event. For a system whose entire thesis is "never lose an event,"
 * a naive implementation of the event store itself would be a
 * contradiction. $push is a single atomic Mongo operation, so this
 * can't happen.
 */
async function append(executionId, type, payload = {}, nodeId = null) {
  const event = { type, nodeId, payload, timestamp: new Date() };

  const updated = await WorkflowExecution.findByIdAndUpdate(
    executionId,
    { $push: { events: event } },
    { new: true }
  );

  if (!updated) {
    throw new Error(`Cannot append event: WorkflowExecution ${executionId} not found`);
  }

  return event;
}

async function getEvents(executionId) {
  const execution = await WorkflowExecution.findById(executionId).select('events');
  if (!execution) {
    throw new Error(`WorkflowExecution ${executionId} not found`);
  }
  return execution.events;
}

module.exports = { append, getEvents };
