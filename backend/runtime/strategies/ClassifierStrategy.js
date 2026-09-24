const NodeStrategy = require('./NodeStrategy');
const Credential = require('../../models/Credential');
const { decrypt } = require('../../utils/encryption');
const GeminiAdapter = require('../adapters/GeminiAdapter');
const OpenAIAdapter = require('../adapters/OpenAIAdapter');

function resolveProvider(model) {
  return model?.includes('OpenAI') ? 'openai' : 'gemini';
}

// Demonstrates the adapter layer's actual reuse value: Classifier needs
// no new provider integration at all, just a different prompt shape
// wrapped around the same generate() call AITaskStrategy uses.
class ClassifierStrategy extends NodeStrategy {
  async execute(input, context) {
    const { model, labels, text } = input;
    if (!labels) throw new Error('Classifier node has no labels configured');

    const labelList = labels.split(',').map((l) => l.trim()).filter(Boolean);
    const provider = resolveProvider(model);

    const credentialDoc = await Credential.findOne({ userId: context.userId, provider });
    if (!credentialDoc) {
      throw new Error(`No ${provider} credential found for this user. Add one in the Credential Vault first.`);
    }

    const apiKey = decrypt(credentialDoc.encryptedValue);
    const adapter = provider === 'openai' ? new OpenAIAdapter(apiKey) : new GeminiAdapter(apiKey);

    const prompt = `Classify the following text into exactly one of these labels: ${labelList.join(', ')}.
Respond with only the label, nothing else.

Text: ${text || '(no input text provided)'}`;

    const rawOutput = await adapter.generate(prompt, { model, temperature: '0.1' }); // low temperature -- classification wants consistency, not creativity
    const label = rawOutput.trim();

    return { provider, model, label, validLabel: labelList.includes(label) };
  }
}

module.exports = ClassifierStrategy;
