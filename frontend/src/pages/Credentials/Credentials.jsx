import { useEffect, useState } from 'react';
import AppShell from '../../components/common/AppShell';
import { listCredentials, createCredential, updateCredential, deleteCredential } from '../../services/credentials';

const PROVIDER_META = {
  gemini: { label: 'Gemini', description: 'Used for AI Task nodes' },
  openai: { label: 'OpenAI', description: 'Alternative AI provider for AI Task nodes' },
  github: { label: 'GitHub', description: 'Used by GitHub Repo nodes' },
  email: { label: 'Email (SMTP)', description: 'Used by Send Email nodes' },
};
export default function Credentials() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeProvider, setActiveProvider] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setCredentials(await listCredentials());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const findCredential = (provider) => credentials.find((c) => c.provider === provider);

  function validateInput(provider) {
    if (provider !== 'email') return null;
    try {
      const smtp = JSON.parse(inputValue);
      if (!smtp || typeof smtp !== 'object' || !smtp.host || !smtp.port || !smtp.user || !smtp.pass) {
        return 'Email credentials must include host, port, user, and pass.';
      }
    } catch {
      return 'Email credentials must be valid JSON.';
    }
    return null;
  }

  async function handleSave(provider) {
    if (!inputValue.trim()) return;
    const validationError = validateInput(provider);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const existing = findCredential(provider);
      if (existing) {
        await updateCredential(existing._id, inputValue);
      } else {
        await createCredential(provider, inputValue);
      }
      setActiveProvider(null);
      setInputValue('');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save credential');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(provider) {
    const existing = findCredential(provider);
    if (!existing) return;
    setError(null);
    try {
      await deleteCredential(existing._id);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete credential');
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-[25px] mb-1.5">Connected services</h1>
      <p className="text-ink/50 text-[14.5px] mb-6">Keys are encrypted before storage and never shown in full.</p>

      {error && <div className="mb-4 px-4 py-2.5 rounded-lg bg-coral-bg text-coral-hover text-[13px] max-w-xl">{error}</div>}

      {loading ? (
        <p className="text-[13px] text-ink/40">Loading…</p>
      ) : (
        <div className="max-w-xl space-y-3">
          {Object.entries(PROVIDER_META).map(([provider, meta]) => {
            const cred = findCredential(provider);
            const isEditing = activeProvider === provider;

            return (
              <div key={provider} className="bg-white border border-ink/10 rounded-xl p-4.5 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${cred ? 'bg-teal' : 'bg-ink/20'}`} />
                      <span className="font-semibold">{meta.label}</span>
                    </div>
                    <p className="text-[12px] text-ink/50 mt-0.5">{meta.description}</p>
                    {cred && <p className="text-[11.5px] font-mono text-ink/60 mt-1">••••••••••••{cred.metadata?.hint || '••••'}</p>}
                  </div>
                  <div className="flex gap-2">
                    {cred && !isEditing && (
                      <button onClick={() => handleDelete(provider)} className="text-[12px] px-3 py-1.5 rounded-lg text-coral-hover hover:bg-coral-bg">
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveProvider(isEditing ? null : provider);
                        setInputValue('');
                      }}
                      className="text-[12px] px-3 py-1.5 rounded-lg bg-teal text-white hover:bg-teal-dark"
                    >
                      {isEditing ? 'Cancel' : cred ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 mt-3.5">
                    <input
                      type={provider === 'email' ? 'text' : 'password'}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={provider === 'email'
                        ? '{"host":"smtp.gmail.com","port":587,"user":"you@gmail.com","pass":"app-password"}'
                        : `Enter ${meta.label} API key`}
                      className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-ink/15 focus:outline-none focus:border-teal"
                    />
                    <button
                      onClick={() => handleSave(provider)}
                      disabled={saving || !inputValue.trim()}
                      className="px-4 py-2 text-[13px] rounded-lg bg-teal text-white disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
