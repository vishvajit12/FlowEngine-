import { NODE_TYPES, LIBRARY_GROUPS } from './nodeRegistry';

export default function NodeLibrary() {
  // React Flow's recommended drag-and-drop pattern: stash the node
  // type on the native dataTransfer object; the canvas's onDrop reads
  // it back and converts the drop screen position into a flow position.
  function handleDragStart(event, nodeType) {
    event.dataTransfer.setData('application/flowengine-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="w-[220px] bg-white border-r border-ink/10 p-4 overflow-y-auto shrink-0">
      <h2 className="font-display font-bold text-[15px] mb-0.5">Node Library</h2>
      <p className="text-[11.5px] text-ink/50 mb-4">Drag to canvas</p>

      {LIBRARY_GROUPS.map((group) => (
        <div key={group.title}>
          <div className="text-[10.5px] font-bold tracking-wide text-ink/40 uppercase mt-4 mb-2 first:mt-0">
            {group.title}
          </div>
          {group.types.map((type) => {
            const def = NODE_TYPES[type];
            return (
              <div
                key={type}
                draggable
                onDragStart={(e) => handleDragStart(e, type)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] border border-ink/10 bg-card mb-1.5 cursor-grab active:cursor-grabbing text-[12.5px] font-semibold hover:shadow-sm transition-shadow"
              >
                <span className={`w-[25px] h-[25px] rounded-[7px] flex items-center justify-center text-[12.5px] shrink-0 ${def.chip}`}>
                  {def.icon}
                </span>
                {def.label}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
