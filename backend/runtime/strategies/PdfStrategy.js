const NodeStrategy = require('./NodeStrategy');
const PDFDocument = require('pdfkit');

// "PDF" and "Resume processing" from Phase 7's deliverable list aren't
// two separate strategies -- the frontend's pdf node already models
// this as one node type with a `template` choice (Architecture Summary
// vs Resume), and the Resume Builder workflow uses this same node type
// with that template selected. One strategy, branching on template,
// matches how the rest of the system already models it.

function renderToBuffer(buildFn) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildFn(doc);
    doc.end();
  });
}

function buildArchitectureSummary(doc, input) {
  const analysis = input.upstreamOutput?.output || '(no analysis text available)';
  doc.fontSize(20).text('Repository Architecture Summary', { underline: true });
  doc.moveDown();
  doc.fontSize(11).text(analysis, { align: 'left' });
}

function buildResume(doc, input) {
  const content = input.upstreamOutput?.output || '(no resume content available)';
  doc.fontSize(18).text('Resume', { underline: true });
  doc.moveDown();
  doc.fontSize(11).text(content, { align: 'left' });
}

class PdfStrategy extends NodeStrategy {
  async execute(input) {
    const { template } = input;

    const buffer = await renderToBuffer((doc) => {
      if (template === 'Resume') {
        buildResume(doc, input);
      } else {
        buildArchitectureSummary(doc, input); // default: Architecture Summary
      }
    });

    // The strategy returns the buffer itself as base64 -- what happens
    // to it after that (save to disk, attach to an email, upload
    // somewhere) is the caller's decision, not this strategy's. Keeping
    // storage concerns out of node execution logic on purpose.
    return {
      template: template || 'Architecture Summary',
      sizeBytes: buffer.length,
      pdfBase64: buffer.toString('base64'),
    };
  }
}

module.exports = PdfStrategy;
