const NodeStrategy = require('./NodeStrategy');

// Webhook and Schedule (below) are trigger node types, not action node
// types -- they represent how a workflow STARTS, not something it DOES
// mid-chain. Neither is in Phase 7's own bullet list (Gemini/OpenAI/
// GitHub/Email/PDF/Resume), and in every current template they only
// ever appear as the entry node with no real upstream work to do.
// Deliberately minimal rather than building out webhook-payload
// validation or cron-schedule logic nobody has asked for yet.
class WebhookStrategy extends NodeStrategy {
  async execute(input) {
    return { triggered: true, path: input.path || null };
  }
}

module.exports = WebhookStrategy;
