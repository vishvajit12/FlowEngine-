const NodeStrategy = require('./NodeStrategy');

class ScheduleStrategy extends NodeStrategy {
  async execute(input) {
    return { triggered: true, cron: input.cron || null };
  }
}

module.exports = ScheduleStrategy;
