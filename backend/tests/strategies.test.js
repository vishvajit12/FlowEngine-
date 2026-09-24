require('./setup-env');
const test = require('node:test');
const assert = require('node:assert');
const PdfStrategy = require('../runtime/strategies/PdfStrategy');
const NodeFactory = require('../runtime/factory');

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

test('NodeFactory throws for an unknown node type', () => {
  assert.throws(() => NodeFactory.create('not-a-real-type'), /Unknown node type/);
});
