const config = require('./env');

// BullMQ (Phase 4) consumes this connection object directly.
// Do NOT open a redis client here -- BullMQ manages its own connections
// per queue/worker using these options.
const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null, // required by BullMQ -- do not remove
};

module.exports = redisConnection;
