import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const publicPrefixes = ['/auth', '/public', '/actuator', '/v3/api-docs', '/swagger-ui.html'];
  const urlPath = config.url || '';
  const isPublic = publicPrefixes.some((p) => urlPath.startsWith(p) || urlPath.includes(p));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  if (!isPublic) {
    // Prevent anonymous calls to protected endpoints — reject early so caller can handle/redirect.
    return Promise.reject({ response: { status: 401, data: 'Client: not authenticated' } });
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';
    const isAuthRequest = requestUrl.startsWith('/auth');
    if ((status === 401 || status === 403) && !isAuthRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;