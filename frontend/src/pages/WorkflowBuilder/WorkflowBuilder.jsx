import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import AppShell from '../../components/common/AppShell';
import NodeLibrary from '../../components/workflow/NodeLibrary';
import ConfigPanel from '../../components/workflow/ConfigPanel';
import FlowNode from '../../components/nodes/FlowNode';
import { TEMPLATES } from '../../components/workflow/templates';
import { getWorkflow, createWorkflow, updateWorkflow } from '../../services/workflow';
import { listCredentials } from '../../services/credentials';
import { runWorkflow } from '../../services/execution';

const nodeTypes = { flowNode: FlowNode };
let idCounter = 100;
const nextId = () => `n${idCounter++}`;

function BuilderCanvas() {
  const { id } = useParams(); // present when editing an existing workflow
  const location = useLocation();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const [workflowName, setWorkflowName] = useState('FlowEngine Onboarding');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Credentials power the "Credential" dropdown in ConfigPanel for AI nodes.
  useEffect(() => {
    listCredentials()
      .then(setCredentials)
      .catch(() => setCredentials([])); // vault empty or unreachable -- fail quiet, field just shows no options
  }, []);

  // Load either: an existing saved workflow (route has :id), a
  // requested template (navigated here with state.template), or
  // fall back to the GitHub template so the canvas is never empty.
  useEffect(() => {
    if (id) {
      getWorkflow(id).then((wf) => {
        setWorkflowName(wf.name);
        setNodes(wf.nodes || []);
        setEdges(wf.edges || []);
      });
      return;
    }
    const templateKey = location.state?.template || 'github';
    const tpl = TEMPLATES[templateKey]();
    setWorkflowName(tpl.name);
    setNodes(tpl.nodes);
    setEdges(tpl.edges);
    setSelectedNodeId(tpl.nodes[tpl.nodes.length > 1 ? 1 : 0]?.id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location.state]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/flowengine-node');
      if (!nodeType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = {
        id: nextId(),
        type: 'flowNode',
        position,
        data: { nodeType, values: {} },
      };
      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id);
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  function handleFieldChange(nodeId, newValues) {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, values: newValues } } : n)));
  }

  function handleDeleteNode(nodeId) {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    try {
      const payload = { name: workflowName, nodes, edges };
      let resolvedId = id;
      if (id) {
        await updateWorkflow(id, payload);
      } else {
        const created = await createWorkflow(payload);
        resolvedId = created._id;
        navigate(`/workflows/${resolvedId}`, { replace: true }); // future saves become updates
      }
      setSaveMessage('Saved ✓');
      return resolvedId;
    } catch (err) {
      setSaveMessage(err.response?.data?.message || 'Save failed');
      return null;
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 2500);
    }
  }

  async function handleRun() {
    setRunning(true);
    try {
      // A never-saved workflow has no id to run yet -- save first, then
      // run with whatever id that produced. An already-saved workflow
      // just runs directly.
      const resolvedId = id || (await handleSave());
      if (!resolvedId) return; // save failed; error already shown via saveMessage
      const execution = await runWorkflow(resolvedId);
      navigate(`/executions/${execution._id}`);
    } catch (err) {
      setSaveMessage(err.response?.data?.message || 'Run failed');
      setTimeout(() => setSaveMessage(''), 2500);
    } finally {
      setRunning(false);
    }
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="grid grid-cols-[220px_1fr_300px] h-screen">
      <NodeLibrary />

      <div className="flex flex-col min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink/10 bg-white">
          <div className="flex items-center gap-2 font-display font-bold text-[15px]">
            <span className="text-ink/30 text-xs">✎</span>
            <input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent outline-none border-b border-transparent focus:border-ink/20"
            />
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && <span className="text-[12px] text-teal-dark font-mono">{saveMessage}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-full text-[12.5px] font-semibold bg-teal text-white hover:bg-teal-dark disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : '⬇ Save'}
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="px-4 py-1.5 rounded-full text-[12.5px] font-semibold border border-ink/15 hover:border-ink/30 transition-colors disabled:opacity-50"
            >
              {running ? 'Starting…' : '▶ Run'}
            </button>
          </div>
        </div>

        <div ref={wrapperRef} className="flex-1 bg-card">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{ style: { stroke: '#348681', strokeWidth: 2, strokeDasharray: '5,5' } }}
          >
            <Background gap={20} color="rgba(57,57,55,0.12)" />
            <Controls />
            <MiniMap pannable zoomable nodeColor="#348681" maskColor="rgba(247,249,252,0.7)" />
          </ReactFlow>
        </div>
      </div>

      <ConfigPanel node={selectedNode} credentials={credentials} onChange={handleFieldChange} onDelete={handleDeleteNode} />
    </div>
  );
}

export default function WorkflowBuilder() {
  return (
    <AppShell contentClassName="">
      <ReactFlowProvider>
        <BuilderCanvas />
      </ReactFlowProvider>
    </AppShell>
  );
}
