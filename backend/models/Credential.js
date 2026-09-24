const mongoose = require('mongoose');

const SUPPORTED_PROVIDERS = ['gemini', 'openai', 'github', 'email'];

const credentialSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: SUPPORTED_PROVIDERS, required: true },
    encryptedValue: { type: String, required: true },
    metadata: {
      hint: { type: String },
    },
  },
  { timestamps: true }
);

credentialSchema.index({ userId: 1, provider: 1 }, { unique: true });

const Credential = mongoose.model('Credential', credentialSchema);
Credential.SUPPORTED_PROVIDERS = SUPPORTED_PROVIDERS;

module.exports = Credential;
