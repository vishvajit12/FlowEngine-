import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

// Maintains live status + a chronological log purely from server events --
// this hook doesn't poll anything. On mount it connects, authenticates
// with the same JWT the REST calls use, and joins exactly one room
// (this executionId). The server-side ownership check (sockets/index.js)
// means joining someone else's executionId here silently does nothing,
// by design, not by accident.
export function useExecutionSocket(executionId) {
  const [status, setStatus] = useState(null); // 'RUNNING' | 'COMPLETED' | 'FAILED' | null (unknown yet)
  const [nodeStates, setNodeStates] = useState({}); // { [nodeId]: 'pending'|'active'|'done'|'failed' }
  const [log, setLog] = useState([]); // chronological feed, newest first
  const [recovery, setRecovery] = useState(null); // last execution:recovered payload, or null
  const socketRef = useRef(null);

  useEffect(() => {
    if (!executionId) return;

    const token = localStorage.getItem('flowengine_token');
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    function pushLog(entry) {
      setLog((prev) => [{ ...entry, time: new Date().toLocaleTimeString([], { hour12: false }) }, ...prev]);
    }

    socket.on('connect', () => socket.emit('join:execution', executionId));

    socket.on('execution:started', () => {
      setStatus('RUNNING');
      pushLog({ type: 'system', message: 'Execution started' });
    });

    socket.on('node:started', ({ nodeId }) => {
      setNodeStates((prev) => ({ ...prev, [nodeId]: 'active' }));
      pushLog({ type: 'node', nodeId, message: `Node ${nodeId} started` });
    });

    socket.on('node:retrying', ({ nodeId, attempt }) => {
      pushLog({ type: 'retry', nodeId, message: `Node ${nodeId} retrying (attempt ${attempt})` });
    });

    socket.on('node:completed', ({ nodeId, isReplay }) => {
      setNodeStates((prev) => ({ ...prev, [nodeId]: 'done' }));
      pushLog({ type: 'node', nodeId, message: isReplay ? `Node ${nodeId} replayed` : `Node ${nodeId} completed` });
    });

    socket.on('node:failed', ({ nodeId, reason, isReplay }) => {
      setNodeStates((prev) => ({ ...prev, [nodeId]: 'failed' }));
      pushLog({ type: 'error', nodeId, message: `${isReplay ? 'Replay of node' : 'Node'} ${nodeId} failed: ${reason}` });
    });

    socket.on('execution:recovered', (payload) => {
      setRecovery(payload);
      pushLog({ type: 'recovery', message: `Recovered — ${payload.completedNodeIds.length} stage(s) preserved, 0 lost` });
    });

    socket.on('execution:completed', () => {
      setStatus('COMPLETED');
      pushLog({ type: 'system', message: 'Execution completed' });
    });

    socket.on('execution:failed', ({ failedNodeId, reason }) => {
      setStatus('FAILED');
      pushLog({ type: 'error', message: `Execution failed at node ${failedNodeId}: ${reason}` });
    });

    return () => {
      socket.emit('leave:execution', executionId);
      socket.disconnect();
    };
  }, [executionId]);

  return { status, setStatus, nodeStates, setNodeStates, log, recovery, clearRecovery: () => setRecovery(null) };
}

