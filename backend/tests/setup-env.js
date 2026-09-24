// Required at the top of any test file that touches config/env.js
// (directly or via something that requires it, like config/redis.js
// or utils/encryption.js). Without this, `npm test` on a genuinely
// fresh clone crashes with "Missing required environment variables"
// before a single assertion runs -- confusing for anyone who unzips
// this and runs tests before setting up a real .env, which is a very
// reasonable thing to try first.
//
// These are NOT real credentials. Tests that need actual Redis
// (bullmq-gotchas.test.js) still require Redis genuinely running --
// this only gets them past the env-validation gate, so a missing
// Redis shows up as a clear connection error instead of an unrelated
// env-var crash.
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/flowengine-test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-for-real-use';
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'a'.repeat(64); // 64 hex chars = 32 bytes, satisfies the length check
