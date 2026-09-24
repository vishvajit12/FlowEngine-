import { Handle, Position } from '@xyflow/react';
import { NODE_TYPES } from '../workflow/nodeRegistry';

// React Flow calls this once per node on the canvas, passing that
// node's `data`. We never write a GithubNode/EmailNode/PdfNode/etc --
// this single component renders all of them by looking up
// `data.nodeType` in the shared registry.
export default function FlowNode({ data, selected }) {
  const def = NODE_TYPES[data.nodeType];
  if (!def) return null;

  return (
    <div
      className={`w-[200px] bg-white rounded-[10px] border-[1.5px] shadow-sm transition-shadow ${
        selected ? 'border-teal shadow-[0_0_0_3px_var(--color-teal-bg)]' : 'border-ink/10'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-[11px] !h-[11px] !bg-white !border-2 !border-teal" />

      <div className="flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-bold border-b border-ink/10">
        <span>{def.icon}</span>
        <span className="truncate">{data.label || def.label}</span>
      </div>
      <div className="px-2.5 py-2 text-[11px] text-ink/50 font-mono leading-snug break-words">
        {def.summary(data.values || {})}
      </div>

      <Handle type="source" position={Position.Right} className="!w-[11px] !h-[11px] !bg-white !border-2 !border-teal" />
    </div>
  );
}
