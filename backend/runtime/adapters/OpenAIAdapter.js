const IAIProviderAdapter = require('./IAIProviderAdapter');

const MODEL_MAP = {
  'GPT-4o (OpenAI)': 'gpt-4o',
};

class OpenAIAdapter extends IAIProviderAdapter {
  constructor(apiKey) {
    super();
    if (!apiKey) throw new Error('OpenAIAdapter requires an API key');
    this.apiKey = apiKey;
  }

  async generate(prompt, { model = 'GPT-4o (OpenAI)', temperature = 0.5 } = {}) {
    const modelId = MODEL_MAP[model] || 'gpt-4o';

    // Chat Completions, not the newer Responses API -- Chat Completions
    // remains fully supported and is the more stable, widely-documented
    // choice for this project's scope. Worth revisiting if the project
    // later needs tool-calling or multi-turn state management, where
    // Responses has real advantages.
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: Number(temperature),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (text === undefined) {
      throw new Error(`OpenAI API returned no usable text. Full response: ${JSON.stringify(data)}`);
    }
    return text;
  }
}

module.exports = OpenAIAdapter;
