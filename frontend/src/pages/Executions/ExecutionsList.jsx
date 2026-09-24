import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/common/AppShell';
import { listExecutions } from '../../services/execution';

const STATUS_STYLE = {
  RUNNING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-teal-bg text-teal-dark',
  FAILED: 'bg-coral-bg text-coral-hover',
};

export default function ExecutionsList() {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listExecutions()
      .then(setExecutions)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <h1 className="font-display text-[25px] mb-1.5">Executions</h1>
      <p className="text-ink/50 text-[14.5px] mb-6">Recent workflow runs, most recent first.</p>

      {loading && <p className="text-[13px] text-ink/40">Loading…</p>}
      {!loading && executions.length === 0 && (
        <div className="bg-white border border-dashed border-ink/15 rounded-xl p-10 text-center text-ink/40 text-[13.5px] max-w-xl">
          No executions yet — run a workflow from the Builder to see it here.
        </div>
      )}

      <div className="bg-white border border-ink/10 rounded-xl shadow-sm overflow-hidden max-w-2xl">
        {executions.map((ex) => (
          <button
            key={ex._id}
            onClick={() => navigate(`/executions/${ex._id}`)}
            className="w-full flex items-center justify-between px-4.5 py-3.5 border-b border-ink/10 last:border-b-0 hover:bg-card text-left"
          >
            <div>
              <div className="text-[13px] font-mono font-semibold">{ex._id}</div>
              <div className="text-[11.5px] text-ink/50 font-mono">{new Date(ex.startedAt).toLocaleString()}</div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${STATUS_STYLE[ex.status] || ''}`}>
              {ex.status}
            </span>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
