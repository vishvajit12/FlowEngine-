/**
 * Every node strategy -- the Phase 5 stub below, and the real
 * GeminiStrategy/GithubStrategy/EmailStrategy/etc. that Phase 7 adds --
 * implements this same shape. The Runtime Engine and the Worker only
 * ever call `.execute()`; neither knows or cares which concrete
 * strategy they're holding. That's the whole point of the pattern.
 */
class NodeStrategy {
  // eslint-disable-next-line no-unused-vars
  async execute(input, context) {
    throw new Error('execute() must be implemented by a NodeStrategy subclass');
  }
}

module.exports = NodeStrategy;
