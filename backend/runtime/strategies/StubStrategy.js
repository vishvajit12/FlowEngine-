const NodeStrategy = require('./NodeStrategy');

/**
 * Phase 5 scope, deliberately: every node type currently resolves to
 * THIS strategy. It doesn't call Gemini, doesn't fetch from GitHub,
 * doesn't send email -- it simulates work and returns a result that
 * names its own node type, so the Factory's dynamic dispatch is
 * actually visible in the output (not just "every node returns the
 * exact same blob").
 *
 * Phase 7 adds one real class per integration (GeminiStrategy,
 * GithubStrategy, EmailStrategy, PdfStrategy...), each implementing
 * the same NodeStrategy contract. NodeFactory.create() below is the
 * ONLY place that changes when that happens -- it starts returning a
 * different concrete class per type instead of always returning this
 * one. The Runtime Engine and Worker that call factory.create() and
 * then strategy.execute() do not change at all.
 */
class StubStrategy extends NodeStrategy {
  constructor(nodeType) {
    super();
    this.nodeType = nodeType;
  }

  async execute(input) {
    await new Promise((resolve) => setTimeout(resolve, 500)); // simulated I/O
    return {
      stub: true,
      nodeType: this.nodeType,
      message: `Executed stub logic for "${this.nodeType}" node`,
      receivedInput: input,
    };
  }
}

module.exports = StubStrategy;
