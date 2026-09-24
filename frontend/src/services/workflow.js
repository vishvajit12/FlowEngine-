import api from './api';

export async function listWorkflows() {
  const { data } = await api.get('/workflows');
  return data.data.workflows;
}

export async function getWorkflow(id) {
  const { data } = await api.get(`/workflows/${id}`);
  return data.data.workflow;
}

export async function createWorkflow({ name, nodes, edges }) {
  const { data } = await api.post('/workflows', { name, nodes, edges });
  return data.data.workflow;
}

export async function updateWorkflow(id, { name, nodes, edges }) {
  const { data } = await api.put(`/workflows/${id}`, { name, nodes, edges });
  return data.data.workflow;
}

export async function deleteWorkflow(id) {
  await api.delete(`/workflows/${id}`);
}
