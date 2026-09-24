import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/common/AppShell';
import { useAuth } from '../../hooks/useAuth';
import { listWorkflows } from '../../services/workflow';
import { getAnalyticsSummary } from '../../services/execution';

const TEMPLATE_CARDS = [
  { key: 'github', icon: '⌥', title: 'GitHub Analyzer', desc: 'Fetch a repo, analyze it with an AI Task node, and email a PDF report.' },
  { key: 'resume', icon: '▤', title: 'Resume Builder', desc: 'Improve and format a resume with AI, then export as PDF.' },
  { key: 'scratch', icon: '+', title: 'Create from scratch', desc: 'Start on a blank canvas and drag nodes in yourself.' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
    getAnalyticsSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);


  function openTemplate(key) {
    navigate('/workflows/new', { state: { template: key } });
  }

  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AppShell>
      {/* Utility bar */}
      <div className="flex items-center gap-4 bg-white border border-ink/10 rounded-full pl-4.5 pr-2.5 py-2 mb-6 shadow-sm flex-wrap">
        <span className="text-ink/40 text-[13px]">⌕</span>
        <input placeholder="Search..." className="bg-transparent outline-none text-[13px] w-32" />
        <div className="flex gap-4 text-[12.5px] text-ink/50 font-medium">
          <span>Docs</span>
          <span>API</span>
          <span>Status</span>
        </div>
        <div className="flex-1" />
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-ink/50 hover:bg-ink/[0.08] cursor-pointer">🔔</span>
        <button onClick={logout} className="w-8 h-8 rounded-full flex items-center justify-center text-ink/50 hover:bg-ink/[0.08]" title="Log out">
          ↩
        </button>
        <span className="w-7 h-7 rounded-full bg-coral text-white flex items-center justify-center text-[11.5px] font-bold">{initials}</span>
      </div>

      {/* Stat cards -- real data from Phase 8's analytics endpoint. The
          Phase 3 placeholders that said "available after Phase 8" are
          exactly what this replaces. */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <div className="bg-white border border-ink/10 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-2.5">
            Total Executions <span>⚡</span>
          </div>
          <div className="font-display text-[25px] font-bold">{summary ? summary.totalExecutions : '—'}</div>
        </div>
        <div className="bg-white border border-ink/10 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-2.5">
            Active Workflows <span>⌘</span>
          </div>
          <div className="font-display text-[25px] font-bold">{loading ? '—' : workflows.length}</div>
        </div>
        <div className="bg-white border border-ink/10 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-2.5">
            Avg Success Rate <span>✓</span>
          </div>
          <div className="font-display text-[25px] font-bold">
            {summary?.successRate !== null && summary?.successRate !== undefined ? `${summary.successRate}%` : '—'}
          </div>
        </div>
      </div>


      <h1 className="font-display text-[25px] mb-1.5">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
      <p className="text-ink/50 text-[14.5px] mb-6">Here's what's happening across your workflows.</p>

      <div className="font-display font-bold text-[15px] mb-3.5">Start from a template</div>
      <div className="grid grid-cols-3 gap-4 mb-7">
        {TEMPLATE_CARDS.map((t) => (
          <button
            key={t.key}
            onClick={() => openTemplate(t.key)}
            className="text-left bg-white border border-ink/10 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="w-8.5 h-8.5 rounded-lg bg-teal-bg text-teal-dark flex items-center justify-center text-[16px] mb-3.5">{t.icon}</div>
            <h4 className="text-[14.5px] font-semibold mb-1">{t.title}</h4>
            <p className="text-[12.5px] text-ink/50 leading-relaxed">{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="font-display font-bold text-[15px] mb-3.5">Recent workflows</div>
      <div className="bg-white border border-ink/10 rounded-xl shadow-sm overflow-hidden">
        {loading && <div className="px-5 py-5 text-[13px] text-ink/40">Loading…</div>}
        {!loading && workflows.length === 0 && (
          <div className="px-5 py-5 text-[13px] text-ink/40">No workflows saved yet — start from a template above.</div>
        )}
        {workflows.map((wf) => (
          <div key={wf._id} className="flex items-center justify-between px-4.5 py-3.5 border-b border-ink/10 last:border-b-0">
            <div className="flex items-center gap-3">
              <span className="w-7.5 h-7.5 rounded-lg bg-sage flex items-center justify-center text-[13px]">⌥</span>
              <div>
                <div className="text-[13.5px] font-semibold">{wf.name}</div>
                <div className="text-[12px] text-ink/50 font-mono">Updated {new Date(wf.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/workflows/${wf._id}`)}
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border border-ink/15 hover:border-ink/30"
            >
              Open
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
