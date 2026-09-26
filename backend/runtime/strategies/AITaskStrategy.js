const NodeStrategy = require('./NodeStrategy');
const Credential = require('../../models/Credential');
const { decrypt } = require('../../utils/encryption');
const GeminiAdapter = require('../adapters/GeminiAdapter');
const OpenAIAdapter = require('../adapters/OpenAIAdapter');

// Which provider a given model label belongs to. If the model string
// contains "OpenAI" it's OpenAI's adapter; anything else defaults to
// Gemini. Small and crude, but matches the two providers this project
// actually supports -- extend this map, not the branching logic, if a
// third provider is added.
function resolveProvider(model) {
  return model?.includes('OpenAI') ? 'openai' : 'gemini';
}

function buildAnalysisPrompt(prompt, upstreamOutput) {
  if (upstreamOutput === undefined || upstreamOutput === null) return prompt;

  const context = typeof upstreamOutput === 'string' ? upstreamOutput : JSON.stringify(upstreamOutput, null, 2);
  return `${prompt}\n\nRepository data from the previous workflow step:\n---\n${context}\n---\nUse this data as the source for your analysis.`;
}

class AITaskStrategy extends NodeStrategy {
  async execute(input, context) {
    const { model, credentialId, prompt, temperature, upstreamOutput } = input;
    if (!prompt) throw new Error('AI Task node has no prompt configured');

    const provider = resolveProvider(model);

    // credentialId is explicit (the frontend's config panel sets it from
    // the live vault) but we still scope the lookup by userId AND
    // provider, not credentialId alone -- a credentialId from a stale
    // or tampered job payload can't be used to read another user's key.
    const credentialDoc = credentialId
      ? await Credential.findOne({ _id: credentialId, userId: context.userId, provider })
      : await Credential.findOne({ userId: context.userId, provider });

    if (!credentialDoc) {
      throw new Error(`No ${provider} credential found for this user. Add one in the Credential Vault first.`);
    }

    const apiKey = decrypt(credentialDoc.encryptedValue);
    const adapter = provider === 'openai' ? new OpenAIAdapter(apiKey) : new GeminiAdapter(apiKey);

    const output = await adapter.generate(buildAnalysisPrompt(prompt, upstreamOutput), { model, temperature });

    return { provider, model, output };
  }
}

module.exports = AITaskStrategy;
module.exports.buildAnalysisPrompt = buildAnalysisPrompt;
