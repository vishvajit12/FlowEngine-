const NodeStrategy = require('./NodeStrategy');
const httpClient = require('../adapters/httpClient');
const Credential = require('../../models/Credential');
const { decrypt } = require('../../utils/encryption');

const GITHUB_HOSTS = ['api.github.com', 'raw.githubusercontent.com', 'github.com'];

function buildReadmeCandidates(repoFullName, defaultBranch, requestedUrl) {
  const candidates = new Set();

  if (repoFullName) {
    const [owner, repo] = repoFullName.split('/').map((segment) => segment.trim()).filter(Boolean);
    if (owner && repo) {
      const branch = defaultBranch || 'main';
      const names = ['README.md', 'README.MD', 'readme.md', 'Readme.md', 'README'];
      for (const fileName of names) {
        candidates.add(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileName}`);
      }
    }
  }

  if (requestedUrl) {
    candidates.add(requestedUrl.startsWith('http') ? requestedUrl : `https://${requestedUrl}`);
  }

  return [...candidates];
}

// Generic on purpose -- but if it happens to be pointed at GitHub (as
// this template's Fetch Metadata / Read README nodes are), reuse the
// same GitHub credential GithubStrategy uses, so this node doesn't hit
// the same unauthenticated rate limit independently.
class HttpStrategy extends NodeStrategy {
  async execute(input, context) {
    const { url, method, upstreamOutput } = input;
    if (!url) throw new Error('HTTP node has no URL configured');

    const headers = {};
    let fullUrl = url.startsWith('http') ? url : `https://${url}`;

    const host = new URL(fullUrl).host;
    if (GITHUB_HOSTS.includes(host) && context?.userId) {
      const credentialDoc = await Credential.findOne({ userId: context.userId, provider: 'github' });
      if (credentialDoc) {
        headers.Authorization = `Bearer ${decrypt(credentialDoc.encryptedValue)}`;
      }
    }

    if (host === 'raw.githubusercontent.com' && upstreamOutput?.fullName) {
      const candidates = buildReadmeCandidates(upstreamOutput.fullName, upstreamOutput.defaultBranch, fullUrl);
      let lastError;

      for (const candidate of candidates) {
        try {
          const { status, data } = await httpClient.request(candidate, { method: method || 'GET', headers });
          return { status, data, url: candidate };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error(`Failed to read repository content for ${upstreamOutput.fullName}`);
    }

    const { status, data } = await httpClient.request(fullUrl, { method: method || 'GET', headers });
    return { status, data, url: fullUrl };
  }
}

module.exports = HttpStrategy;