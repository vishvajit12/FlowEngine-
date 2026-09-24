import axios from 'axios';

// One shared axios instance. Every other service file imports THIS,
// not axios directly -- so token attachment and 401 handling live
// in exactly one place.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flowengine_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token expired or invalid -- clear it and bounce to login.
    // We don't redirect via react-router here (this file has no
    // component context); AuthContext's own effect handles routing
    // once it sees the token disappear.
    if (error.response?.status === 401) {
      localStorage.removeItem('flowengine_token');
      localStorage.removeItem('flowengine_user');
    }
    return Promise.reject(error);
  }
);

export default api;
