import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// Public API client - for unauthenticated requests
export const publicApiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authenticated API client - for requests that require auth
export const authenticatedApiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
authenticatedApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling - only on authenticated client
authenticatedApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Trigger login modal instead of direct redirect
      const event = new CustomEvent('auth:required', { detail: { returnUrl: window.location.pathname } });
      window.dispatchEvent(event);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; username: string; role: 'USER' | 'PROVIDER'; invitationCode?: string }) =>
    publicApiClient.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    publicApiClient.post('/auth/login', data),
  getMe: () => authenticatedApiClient.get('/auth/me'),
  validateInvitationCode: (code: string) =>
    publicApiClient.post('/auth/invitation/validate', { code }),
  generateInvitationCode: (count?: number) =>
    authenticatedApiClient.post('/auth/invitation/generate', { count: count || 1 }),
  getMyInvitationCodes: () =>
    authenticatedApiClient.get('/auth/invitation/my'),
};

// Projects API
export const projectsApi = {
  list: (params?: any) => publicApiClient.get('/projects', { params }),
  getById: (id: string) => publicApiClient.get(`/projects/${id}`),
  getMyProjects: () => authenticatedApiClient.get('/projects/my'),
  create: (data: any) => authenticatedApiClient.post('/projects', data),
  update: (id: string, data: any) => authenticatedApiClient.patch(`/projects/${id}`, data),
  delete: (id: string) => authenticatedApiClient.delete(`/projects/${id}`),
};

// Leads API
export const leadsApi = {
  submit: (projectId: string, data: any) =>
    authenticatedApiClient.post(`/projects/${projectId}/leads`, data),
  getMyLeads: () => authenticatedApiClient.get('/users/me/leads'),
  getProjectLeads: (projectId: string) =>
    authenticatedApiClient.get(`/projects/${projectId}/leads`),
  updateStatus: (id: string, data: any) =>
    authenticatedApiClient.patch(`/leads/${id}`, data),
};

// Showcase API (Featured projects and policies)
export const showcaseApi = {
  getHomepageData: () => publicApiClient.get('/showcase/homepage'),
  getFeaturedProjects: () => publicApiClient.get('/showcase/featured'),
  getAllProjects: (params?: any) => publicApiClient.get('/showcase/all', { params }),
  getPolicies: () => publicApiClient.get('/showcase/policies'),
  getCategories: () => publicApiClient.get('/showcase/categories'),
  getProjectById: (id: string) => publicApiClient.get(`/showcase/${id}`),
};

// Admin API
export const adminApi = {
  getPendingProjects: () => authenticatedApiClient.get('/admin/projects/pending'),
  getAllProjects: (params?: any) => authenticatedApiClient.get('/admin/projects', { params }),
  approveProject: (id: string) => authenticatedApiClient.post(`/admin/projects/${id}/approve`),
  rejectProject: (id: string, reason: string) =>
    authenticatedApiClient.post(`/admin/projects/${id}/reject`, { reason }),
  getStats: () => authenticatedApiClient.get('/admin/stats'),
  getUsers: (params?: any) => authenticatedApiClient.get('/admin/users', { params }),
  getUserById: (id: string) => authenticatedApiClient.get(`/admin/users/${id}`),
  certifyUser: (id: string, certified: boolean) =>
    authenticatedApiClient.patch(`/admin/users/${id}/certify`, { certified }),
};

// Users API
export const usersApi = {
  getMyPoints: () => authenticatedApiClient.get('/users/me/points'),
  getUserPoints: (id: string) => publicApiClient.get(`/users/${id}/points`),
};
