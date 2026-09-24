import { NODE_TYPES } from './nodeRegistry';

export default function ConfigPanel({ node, credentials, onChange, onDelete }) {
  if (!node) {
    return (
      <aside className="w-[300px] bg-white border-l border-ink/10 shrink-0">
        <div className="text-[13px] text-ink/40 text-center py-16 px-4">Select a node to configure it</div>
      </aside>
    );
  }

  const def = NODE_TYPES[node.data.nodeType];
  const values = node.data.values || {};

  function updateField(key, val) {
    onChange(node.id, { ...values, [key]: val });
  }

  return (
    <aside className="w-[300px] bg-white border-l border-ink/10 shrink-0 overflow-y-auto">
      <h3 className="font-display font-bold text-[15px] px-5 pt-5">{node.data.label || def.label}</h3>
      <p className="text-[11.5px] text-ink/50 px-5 pb-4">{def.category} node</p>

      <div className="px-5 space-y-4 pb-5">
        {def.fields.map((f) => (
          <div key={f.key}>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-1.5">
              {f.label}
              {f.type === 'range' && <span className="normal-case font-normal"> — {values[f.key] ?? 0.5}</span>}
            </label>

            {f.type === 'select' && (
              <select
                value={values[f.key] || f.options[0]}
                onChange={(e) => updateField(f.key, e.target.value)}
                className="w-full px-2.5 py-2 rounded-[7px] border-[1.5px] border-ink/10 bg-card text-[12.5px]"
              >
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            )}

            {f.type === 'credential' && (
              <select
                value={values[f.key] || ''}
                onChange={(e) => updateField(f.key, e.target.value)}
                className="w-full px-2.5 py-2 rounded-[7px] border-[1.5px] border-ink/10 bg-card text-[12.5px]"
              >
                <option value="">Select credential…</option>
                {credentials.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.provider} — ••••{c.metadata?.hint || '••••'}
                  </option>
                ))}
              </select>
            )}

            {f.type === 'textarea' && (
              <textarea
                value={values[f.key] || ''}
                placeholder={f.placeholder}
                onChange={(e) => updateField(f.key, e.target.value)}
                rows={4}
                className="w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[12px] leading-relaxed p-3 rounded-lg outline-none resize-none"
              />
            )}

            {f.type === 'range' && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={values[f.key] ?? 0.5}
                onChange={(e) => updateField(f.key, e.target.value)}
                className="w-full accent-teal"
              />
            )}

            {f.type === 'text' && (
              <input
                type="text"
                value={values[f.key] || ''}
                placeholder={f.placeholder}
                onChange={(e) => updateField(f.key, e.target.value)}
                className="w-full px-2.5 py-2 rounded-[7px] border-[1.5px] border-ink/10 bg-card text-[12.5px]"
              />
            )}
          </div>
        ))}

        <button
          onClick={() => onDelete(node.id)}
          className="w-full text-[12.5px] font-semibold text-coral-hover border border-coral-bg rounded-lg py-2 hover:bg-coral-bg transition-colors"
        >
          🗑 Delete Node
        </button>
      </div>
    </aside>
  );
}
