import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../../components/common/AppShell';
import { useExecutionSocket } from '../../hooks/useExecutionSocket';
import { getExecution, downloadExecutionPdf, retryExecution, replayNode } from '../../services/execution';

// Walks the definition's nodes/edges into linear order -- same rule as
// the backend's dagUtils.js (linear chains only), reimplemented here
// purely for rendering order. Not a second source of truth for control
// flow; the backend still owns that entirely.
function linearOrder(nodes, edges) {
  const targetIds = new Set(edges.map((e) => e.target));
  const entry = nodes.find((n) => !targetIds.has(n.id));
  if (!entry) return nodes;
  const order = [entry];
  let current = entry.id;
  while (true) {
    const edge = edges.find((e) => e.source === current);
    if (!edge) break;
    const next = nodes.find((n) => n.id === edge.target);
    if (!next) break;
    order.push(next);
    current = next.id;
  }
  return order;
}

export default function ExecutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [definition, setDefinition] = useState(null);
  const [workflowName, setWorkflowName] = useState('');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [hasPdf, setHasPdf] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const { status, setStatus, nodeStates, setNodeStates, log, recovery } = useExecutionSocket(id);
  // Initial fetch: covers both "I navigated here after it already
  // finished" (socket won't replay past events) and "give me the node
  // order to render before any live event has arrived yet." Seeds the
  // hook's actual state via its setter -- mutating a plain local object
  // here wouldn't trigger a re-render and would be silently discarded.
  useEffect(() => {
    setLoading(true);
    getExecution(id)
      .then(({ execution, state }) => {
        setDefinition(execution.workflowDefinitionId);
        setWorkflowName(execution.workflowDefinitionId?.name || 'Workflow');
        setStatus(execution.status);

        const seed = {};
        state.completedNodeIds.forEach((nodeId) => {
          seed[nodeId] = 'done';
        });
        if (state.failedNodeId) seed[state.failedNodeId] = 'failed';
        setNodeStates((prev) => ({ ...seed, ...prev })); // live socket updates (prev) win over the initial snapshot
        setHasPdf(Object.values(state.completedNodeOutputs || {}).some((output) => output?.pdfBase64));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const orderedNodes = useMemo(() => {
    if (!definition) return [];
    return linearOrder(definition.nodes, definition.edges);
  }, [definition]);


  useEffect(() => {
    if (recovery) setShowRecoveryModal(false); // banner shows first; modal opens on click, not automatically
  }, [recovery]);

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryExecution(id);
    } finally {
      setRetrying(false);
    }
  }

  async function handleReplay(nodeId) {
    await replayNode(id, nodeId);
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      await downloadExecutionPdf(id);
    } finally {
      setDownloadingPdf(false);
    }
  }

  const statusStyle = {
    RUNNING: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-teal-bg text-teal-dark',
    FAILED: 'bg-coral-bg text-coral-hover',
  }[status] || 'bg-ink/10 text-ink/50';

  return (
    <AppShell contentClassName="p-9 max-w-none">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[25px] mb-1">{workflowName}</h1>
          <span className="text-[12px] font-mono text-ink/40">Execution {id}</span>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-[12px] font-mono font-semibold ${statusStyle}`}>
          {status || (loading ? 'Loading…' : 'Unknown')}
        </span>
        {hasPdf && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-teal text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {downloadingPdf ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        )}
      </div>

      {recovery && (
        <div className="flex items-center justify-between gap-3 bg-teal-bg border border-teal/30 rounded-lg px-4 py-3 mb-5 flex-wrap">
          <span className="text-[13px] font-semibold text-teal-dark">
            ⚠ Recovered — {recovery.completedNodeIds.length} stage(s) preserved, 0 lost.
          </span>
          <button
            onClick={() => setShowRecoveryModal(true)}
            className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold bg-teal text-white hover:bg-teal-dark"
          >
            What did we save? →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Timeline */}
        <div className="bg-white border border-ink/10 rounded-2xl p-7">
          <ul className="space-y-0">
            {orderedNodes.map((node, i) => {
              const state = nodeStates[node.id] || 'pending';
              const isLast = i === orderedNodes.length - 1;
              return (
                <li key={node.id} className="flex gap-4 relative pb-6 last:pb-0">
                  {!isLast && (
                    <span
                      className={`absolute left-[9px] top-5 bottom-0 w-[2px] ${
                        state === 'done' ? 'bg-teal' : 'bg-ink/10'
                      }`}
                    />
                  )}
                  <span
                    className={`w-5 h-5 rounded-full shrink-0 z-10 ${
                      state === 'done'
                        ? 'bg-teal'
                        : state === 'active'
                        ? 'bg-amber-400'
                        : state === 'failed'
                        ? 'bg-coral'
                        : 'bg-ink/15'
                    }`}
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="text-[13.5px] font-semibold">{node.data.label || node.data.nodeType}</div>
                      <div className="text-[11px] font-mono text-ink/40 uppercase">{state}</div>
                    </div>
                    {state === 'done' && (
                      <button
                        onClick={() => handleReplay(node.id)}
                        className="text-[11.5px] font-semibold text-teal hover:text-teal-dark px-2 py-1"
                      >
                        Replay
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {status === 'FAILED' && (
            <div className="mt-6 pt-5 border-t border-dashed border-ink/15">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="px-4 py-2 rounded-full text-[13px] font-semibold bg-teal text-white hover:bg-teal-dark disabled:opacity-50"
              >
                {retrying ? 'Retrying…' : 'Retry from failed node'}
              </button>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-white border border-ink/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-ink/10 font-display font-bold text-[13.5px]">Execution Log</div>
          <ul className="p-4 space-y-3 max-h-[460px] overflow-y-auto">
            {log.length === 0 && <li className="text-[12.5px] text-ink/40">No events yet.</li>}
            {log.map((entry, i) => (
              <li key={i} className="text-[12px]">
                <div className="flex justify-between text-ink/40 font-mono text-[10.5px] mb-0.5">
                  <span>{entry.type}</span>
                  <span>{entry.time}</span>
                </div>
                <div className={entry.type === 'error' ? 'text-coral-hover' : 'text-ink/70'}>{entry.message}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recovery modal */}
      {showRecoveryModal && recovery && (
        <div
          className="fixed inset-0 bg-ink/50 flex items-center justify-center p-5 z-50"
          onClick={(e) => e.target === e.currentTarget && setShowRecoveryModal(false)}
        >
          <div className="bg-white rounded-2xl p-7 max-w-md w-full">
            <button onClick={() => setShowRecoveryModal(false)} className="float-right text-ink/40 hover:text-ink text-xl leading-none">
              ×
            </button>
            <h3 className="font-display text-[17px] text-teal-dark mb-1">⚠ Recovery Summary</h3>
            <p className="text-[12.5px] text-ink/50 mb-4">Recovered after a server interruption</p>
            <div className="grid grid-cols-2 gap-4 text-[12.5px] mb-4">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-teal-dark/75 font-bold mb-2">Completed before crash</div>
                <ul className="space-y-1 text-ink/70">
                  {recovery.completedNodeIds.map((nid) => (
                    <li key={nid}>✓ {nid}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-teal-dark/75 font-bold mb-2">Preserved</div>
                <ul className="space-y-1 text-ink/70">
                  <li>✓ Event history</li>
                  <li>✓ Workflow state</li>
                  <li>✓ Node outputs</li>
                </ul>
              </div>
            </div>
            <div className="pt-3 border-t border-teal/20 text-[12.5px]">
              Lost work: <b className="font-mono bg-card px-2 py-0.5 rounded">{recovery.lostWork} stages</b> · Resumed from{' '}
              <b className="font-mono bg-card px-2 py-0.5 rounded">{recovery.resumedFrom || '—'}</b>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/executions')} className="mt-6 text-[12.5px] text-ink/50 hover:text-teal">
        ← Back to executions
      </button>
    </AppShell>
  );
}
