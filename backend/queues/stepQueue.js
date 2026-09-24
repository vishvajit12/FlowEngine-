const { Queue } = require('bullmq');
const connection = require('../config/redis');

// One queue for every node type, not one queue per node type.
// The job's `data.nodeType` is what differentiates the work, not which
// queue it landed in -- keeps this monolithic instead of managing N
// queues, matching the "do NOT over-engineer" directive. The Runtime
// Engine (Phase 5) decides *what* job to add and *when*; this file only
// defines *where* jobs go.
const stepQueue = new Queue('step-execution', { connection });

module.exports = stepQueue;
