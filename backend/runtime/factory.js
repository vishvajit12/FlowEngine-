const WebhookStrategy = require('./strategies/WebhookStrategy');
const ScheduleStrategy = require('./strategies/ScheduleStrategy');
const AITaskStrategy = require('./strategies/AITaskStrategy');
const ClassifierStrategy = require('./strategies/ClassifierStrategy');
const HttpStrategy = require('./strategies/HttpStrategy');
const EmailStrategy = require('./strategies/EmailStrategy');
const GithubStrategy = require('./strategies/GithubStrategy');
const PdfStrategy = require('./strategies/PdfStrategy');

// Phase 5 had every type resolve to the same StubStrategy. This map is
// the ONLY thing that changed to make Phase 7 real -- nothing calling
// NodeFactory.create() (the Worker) needed to change at all, which was
// the entire point of building the Factory/Strategy seam this early.
const STRATEGY_MAP = {
  webhook: WebhookStrategy,
  schedule: ScheduleStrategy,
  aitask: AITaskStrategy,
  classifier: ClassifierStrategy,
  http: HttpStrategy,
  email: EmailStrategy,
  github: GithubStrategy,
  pdf: PdfStrategy,
};

class NodeFactory {
  static create(nodeType) {
    const StrategyClass = STRATEGY_MAP[nodeType];
    if (!StrategyClass) {
      throw new Error(`Unknown node type: "${nodeType}"`);
    }
    return new StrategyClass();
  }
}

module.exports = NodeFactory;
