import api from './api';

export async function listCredentials() {
  const { data } = await api.get('/credentials');
  return data.data.credentials;
}

export async function createCredential(provider, value) {
  const { data } = await api.post('/credentials', { provider, value });
  return data.data.credential;
}

export async function updateCredential(id, value) {
  const { data } = await api.put(`/credentials/${id}`, { value });
  return data.data.credential;
}

export async function deleteCredential(id) {
  await api.delete(`/credentials/${id}`);
}
