require('./setup-env');
const test = require('node:test');
const assert = require('node:assert');
const PdfStrategy = require('../runtime/strategies/PdfStrategy');
const GithubStrategy = require('../runtime/strategies/GithubStrategy');
const AITaskStrategy = require('../runtime/strategies/AITaskStrategy');
const NodeFactory = require('../runtime/factory');
const httpClient = require('../runtime/adapters/httpClient');
const Credential = require('../models/Credential');
const { encrypt } = require('../utils/encryption');

test('PdfStrategy produces a genuinely valid PDF (not just a non-empty buffer)', async () => {
  const strategy = new PdfStrategy();
  const result = await strategy.execute({
    template: 'Architecture Summary',
    upstreamOutput: { output: 'Test analysis content for verification.' },
  });

  const buffer = Buffer.from(result.pdfBase64, 'base64');
  const header = buffer.subarray(0, 5).toString('ascii');
  const tail = buffer.subarray(-6).toString('ascii');

  assert.strictEqual(header, '%PDF-', 'output must start with a valid PDF header');
  assert.strictEqual(tail.trim(), '%%EOF', 'output must end with a valid PDF trailer');
  assert.ok(result.sizeBytes > 0);
});

test('PdfStrategy renders different content for the Resume template', async () => {
  const strategy = new PdfStrategy();
  const archResult = await strategy.execute({ template: 'Architecture Summary', upstreamOutput: { output: 'X' } });
  const resumeResult = await strategy.execute({ template: 'Resume', upstreamOutput: { output: 'Y' } });
  assert.strictEqual(archResult.template, 'Architecture Summary');
  assert.strictEqual(resumeResult.template, 'Resume');
});

test('NodeFactory resolves all 8 known node types', () => {
  const types = ['webhook', 'schedule', 'aitask', 'classifier', 'http', 'email', 'github', 'pdf'];
  for (const type of types) {
    const strategy = NodeFactory.create(type);
    assert.ok(strategy, `expected a strategy instance for type "${type}"`);
    assert.strictEqual(typeof strategy.execute, 'function');
  }
});

test('GithubStrategy trims whitespace before parsing a repo URL', async () => {
  const originalRequest = httpClient.request;
  const originalFindOne = Credential.findOne;
  Credential.findOne = async () => null;
  httpClient.request = async (url) => {
    assert.match(url, /\/repos\/sudeshkarande73\/filegate$/);
    return { data: { full_name: 'sudeshkarande73/filegate', default_branch: 'main', private: false, stargazers_count: 9, language: 'JavaScript' } };
  };

  try {
    const strategy = new GithubStrategy();
    const result = await strategy.execute({ repo: ' github.com/sudeshkarande73/filegate  ' }, { userId: 'u-1' });
    assert.strictEqual(result.fullName, 'sudeshkarande73/filegate');
    assert.strictEqual(result.repo, 'filegate');
  } finally {
    httpClient.request = originalRequest;
    Credential.findOne = originalFindOne;
  }
});

test('AITaskStrategy includes upstream repo context in the prompt sent to the model', async () => {
  const originalFindOne = Credential.findOne;
  const originalGenerate = require('../runtime/adapters/GeminiAdapter').prototype.generate;

  Credential.findOne = async () => ({
    _id: 'cred-1',
    userId: 'u-1',
    provider: 'gemini',
    encryptedValue: encrypt('fake-key'),
  });
  require('../runtime/adapters/GeminiAdapter').prototype.generate = async function (prompt) {
    assert.match(prompt, /Repository context:/);
    assert.match(prompt, /filegate/);
    return 'summary';
  };

  try {
    const strategy = new AITaskStrategy();
    const result = await strategy.execute({
      model: 'gemini-2.5-flash',
      prompt: 'Analyze this repository\'s architecture.',
      upstreamOutput: {
        data: 'README content for filegate',
        fullName: 'sudeshkarande73/filegate',
      },
    }, { userId: 'u-1' });
    assert.strictEqual(result.output, 'summary');
  } finally {
    Credential.findOne = originalFindOne;
    require('../runtime/adapters/GeminiAdapter').prototype.generate = originalGenerate;
  }
});

test('NodeFactory throws for an unknown node type', () => {
  assert.throws(() => NodeFactory.create('not-a-real-type'), /Unknown node type/);
});
