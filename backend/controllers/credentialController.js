const Credential = require('../models/Credential');
const { encrypt } = require('../utils/encryption');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const { SUPPORTED_PROVIDERS } = Credential;

function maskHint(rawValue) {
  return rawValue.length > 4 ? rawValue.slice(-4) : '****';
}

function validateCredentialValue(provider, value) {
  if (provider !== 'email') return;

  let smtp;
  try {
    smtp = JSON.parse(value);
  } catch {
    throw new ApiError(400, 'Email credential must be JSON: {"host":"smtp.gmail.com","port":587,"user":"you@gmail.com","pass":"your-app-password"}');
  }

  if (!smtp || typeof smtp !== 'object' || !smtp.host || !smtp.port || !smtp.user || !smtp.pass) {
    throw new ApiError(400, 'Email credential must include host, port, user, and pass');
  }
}

const listCredentials = asyncHandler(async (req, res) => {
  const credentials = await Credential.find({ userId: req.user._id }).select('provider metadata.hint updatedAt');
  res.status(200).json({ success: true, data: { credentials } });
});

const createCredential = asyncHandler(async (req, res) => {
  const { provider, value } = req.body;
  if (!provider || !value) throw new ApiError(400, 'provider and value are required');
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new ApiError(400, `provider must be one of: ${SUPPORTED_PROVIDERS.join(', ')}`);
  }
  validateCredentialValue(provider, value);

  const existing = await Credential.findOne({ userId: req.user._id, provider });
  if (existing) {
    throw new ApiError(409, `A ${provider} credential already exists — use PUT /api/credentials/${existing._id} to update it`);
  }

  const credential = await Credential.create({
    userId: req.user._id,
    provider,
    encryptedValue: encrypt(value),
    metadata: { hint: maskHint(value) },
  });

  res.status(201).json({
    success: true,
    data: { credential: { id: credential._id, provider: credential.provider, hint: credential.metadata.hint, updatedAt: credential.updatedAt } },
  });
});

const updateCredential = asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (!value) throw new ApiError(400, 'value is required');

  const credential = await Credential.findOne({ _id: req.params.id, userId: req.user._id });
  if (!credential) throw new ApiError(404, 'Credential not found');
  validateCredentialValue(credential.provider, value);

  credential.encryptedValue = encrypt(value);
  credential.metadata.hint = maskHint(value);
  await credential.save();

  res.status(200).json({
    success: true,
    data: { credential: { id: credential._id, provider: credential.provider, hint: credential.metadata.hint, updatedAt: credential.updatedAt } },
  });
});

const deleteCredential = asyncHandler(async (req, res) => {
  const credential = await Credential.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!credential) throw new ApiError(404, 'Credential not found');
  res.status(200).json({ success: true, data: null });
});

module.exports = { listCredentials, createCredential, updateCredential, deleteCredential };
