const IAIProviderAdapter = require('./IAIProviderAdapter');

const GEMINI_MODEL = 'gemini-3.6-flash';
const MODEL_MAP = {
  'Gemini 3.6 Flash': GEMINI_MODEL,
  'gemini-3.6-flash': GEMINI_MODEL,
  'Gemini 2.5 Pro': GEMINI_MODEL,
  'gemini-2.5-pro': GEMINI_MODEL,
};

const DEFAULT_MODEL = GEMINI_MODEL;

class GeminiAdapter extends IAIProviderAdapter {
  constructor(apiKey) {
    super();
    if (!apiKey) throw new Error('GeminiAdapter requires an API key');
    this.apiKey = apiKey;
  }

  async generate(prompt, { model = 'gemini-3.6-flash', temperature = 0.5 } = {}) {
    const modelId = MODEL_MAP[model] || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: Number(temperature) },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text === undefined) {
      throw new Error(`Gemini API returned no usable text. Full response: ${JSON.stringify(data)}`);
    }
    return text;
  }
}

module.exports = GeminiAdapter;