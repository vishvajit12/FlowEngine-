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

function truncateForPrompt(value, maxChars = 6000) {
  if (!value) return value;
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > maxChars ? `${text.slice(0, maxChars - 120)}\n... [truncated for model context window]` : text;
}

function buildPromptWithContext(prompt, upstreamOutput) {
  if (!upstreamOutput) return prompt;

  const repoMeta = [];
  if (upstreamOutput.fullName) repoMeta.push(`- Repository: ${upstreamOutput.fullName}`);
  if (upstreamOutput.defaultBranch) repoMeta.push(`- Default branch: ${upstreamOutput.defaultBranch}`);
  if (upstreamOutput.language) repoMeta.push(`- Language: ${upstreamOutput.language}`);
  if (upstreamOutput.owner) repoMeta.push(`- Owner: ${upstreamOutput.owner}`);
  if (upstreamOutput.repo) repoMeta.push(`- Repo: ${upstreamOutput.repo}`);

  const extras = [];
  if (upstreamOutput.data) {
    const summary = truncateForPrompt(upstreamOutput.data);
    extras.push(`Repository context:\n${summary}`);
  }

  const contextBlock = [
    ...repoMeta,
    ...(extras.length ? ['\n' + extras.join('\n\n')] : []),
  ].join('\n');

  if (!contextBlock) return prompt;

  return `${contextBlock}\n\n${prompt}`;
}

class AITaskStrategy extends NodeStrategy {
  async execute(input, context) {
    const { model, credentialId, prompt, temperature, upstreamOutput } = input;
    if (!prompt) throw new Error('AI Task node has no prompt configured');

    const provider = resolveProvider(model);
    const enrichedPrompt = buildPromptWithContext(prompt, upstreamOutput);

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

    const output = await adapter.generate(enrichedPrompt, { model, temperature });

    return { provider, model, output };
  }
}

module.exports = AITaskStrategy;
