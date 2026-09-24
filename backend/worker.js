require('./config/env'); // validate env vars first, same as index.js
const connectDB = require('./config/database');

// This is a SEPARATE process from index.js (the Express API), started
// with its own `node worker.js`. Two reasons this matters:
//
// 1. It matches the architecture: the API and the Worker are drawn as
//    distinct boxes talking through Redis, not one process doing both.
// 2. It's the durability story applied to our own infrastructure: a
//    worker crash (mid node-execution) shouldn't take the API down
//    with it, and restarting the worker shouldn't require restarting
//    the API. Same principle Phase 6 builds for workflow executions,
//    just applied here first at the process level.
//
// Phase 4/5 deliberately left MongoDB out of this file -- the stub
// processor never touched it. Phase 7 is where that stops being true:
// AITaskStrategy and GithubStrategy both need to read the Credentials
// collection to decrypt a user's API key before calling out to Gemini,
// OpenAI, or GitHub. Connecting here, now, is that foreshadowed change.

async function startWorker() {
  await connectDB();
  require('./workers/stepWorker'); // starts listening once DB is ready, not before
  console.log('👷 FlowEngine Worker process started — listening for jobs on "step-execution"');
}

startWorker();
