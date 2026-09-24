const NodeStrategy = require('./NodeStrategy');
const Credential = require('../../models/Credential');
const { decrypt } = require('../../utils/encryption');
const httpClient = require('../adapters/httpClient');

function parseOwnerRepo(repoInput) {
  // Accepts "github.com/owner/repo", "https://github.com/owner/repo", or "owner/repo"
  const cleaned = repoInput.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/\/$/, '');
  const [owner, repo] = cleaned.split('/');
  if (!owner || !repo) throw new Error(`Could not parse a valid owner/repo from "${repoInput}"`);
  return { owner, repo };
}

class GithubStrategy extends NodeStrategy {
  async execute(input, context) {
    const { repo } = input;
    if (!repo) throw new Error('GitHub node has no repository URL configured');

    const { owner, repo: repoName } = parseOwnerRepo(repo);

    // A GitHub token is optional here, deliberately: public repos work
    // fine unauthenticated (just a lower rate limit -- 60/hour vs
    // 5000/hour). Only look one up if the user has actually added one;
    // don't force a credential requirement this node doesn't strictly need.
    const headers = { Accept: 'application/vnd.github+json' };
    const credentialDoc = await Credential.findOne({ userId: context.userId, provider: 'github' });
    if (credentialDoc) {
      headers.Authorization = `Bearer ${decrypt(credentialDoc.encryptedValue)}`;
    }

    const { data } = await httpClient.request(`https://api.github.com/repos/${owner}/${repoName}`, { headers });

    return {
      validated: true,
      owner,
      repo: repoName,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      stars: data.stargazers_count,
      language: data.language,
    };
  }
}

module.exports = GithubStrategy;
