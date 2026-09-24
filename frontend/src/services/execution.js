import api from './api';

export async function runWorkflow(workflowId) {
  const { data } = await api.post(`/workflows/${workflowId}/run`);
  return data.data.execution;
}

export async function getExecution(executionId) {
  const { data } = await api.get(`/executions/${executionId}`);
  return data.data; // { execution, state }
}

export async function downloadExecutionPdf(executionId) {
  const response = await api.get(`/executions/${executionId}/pdf`, { responseType: 'blob' });
  const contentDisposition = response.headers['content-disposition'] || '';
  const filename = contentDisposition.match(/filename="([^"]+)"/)?.[1] || 'flowengine-report.pdf';
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function retryExecution(executionId) {
  const { data } = await api.post(`/executions/${executionId}/retry`);
  return data.data.execution;
}

export async function replayNode(executionId, nodeId) {
  const { data } = await api.post(`/executions/${executionId}/replay`, { nodeId });
  return data.data.execution;
}

export async function listExecutions(workflowId) {
  const { data } = await api.get('/analytics/executions', { params: workflowId ? { workflowId } : {} });
  return data.data.executions;
}

export async function getAnalyticsSummary() {
  const { data } = await api.get('/analytics/summary');
  return data.data;
}
