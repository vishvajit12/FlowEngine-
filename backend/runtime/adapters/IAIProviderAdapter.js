/**
 * This is the one place in Phase 7 that's a true GoF Adapter pattern --
 * multiple real, interchangeable implementations of the same contract.
 * GitHub/Email/PDF below don't get this treatment because there's only
 * ever one way to fetch from GitHub or send an SMTP email; inventing a
 * swappable-provider interface for something with a single
 * implementation would be exactly the over-engineering the spec rules
 * out. AI provider IS genuinely swappable -- that's the whole reason
 * this node type is called "AI Task" and not "Gemini Task."
 */
class IAIProviderAdapter {
  // eslint-disable-next-line no-unused-vars
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by an IAIProviderAdapter subclass');
  }
}

module.exports = IAIProviderAdapter;
