const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const WorkflowExecution = require('../models/WorkflowExecution');

let io = null;
let warnedNotInitialized = false;

// A no-op stand-in used when getIO() is called before initSockets()
// has run -- e.g. from a script or test that exercises runtime/engine.js
// directly without booting the full server (every Phase 5-7 test in
// this project did exactly that). Monitoring must never be a hard
// dependency for the durability engine to function: if emitting a
// socket event could throw and abort a node's completion handling,
// observability would have become a reliability risk instead of a
// pure add-on. This keeps emission "fire and forget" everywhere it's
// called from runtime/engine.js and runtime/replay.js.
const NOOP_IO = { to: () => ({ emit: () => {} }) };

function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' }, // dev-friendly; tighten to your actual frontend origin before deploying
  });

  // Socket.io connections don't carry an Authorization header the way
  // HTTP requests do -- the JWT travels in the handshake's `auth`
  // payload instead (client: `io(url, { auth: { token } })`).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:execution', async (executionId) => {
      // Verify OWNERSHIP before joining the room, not just that the
      // execution exists -- otherwise any authenticated user could
      // watch any other user's execution just by guessing/enumerating
      // IDs. Silently no-op on mismatch rather than emitting an error:
      // that avoids confirming to a probing client whether a given ID
      // exists at all for someone else.
      const execution = await WorkflowExecution.findOne({ _id: executionId, userId: socket.userId });
      if (!execution) return;
      socket.join(executionId.toString());
    });

    socket.on('leave:execution', (executionId) => {
      socket.leave(executionId.toString());
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    if (!warnedNotInitialized) {
      console.warn(
        '[Sockets] getIO() called before initSockets() — events will be silently dropped. Expected in scripts/tests that don\'t boot the full server.'
      );
      warnedNotInitialized = true;
    }
    return NOOP_IO;
  }
  return io;
}

module.exports = { initSockets, getIO };
