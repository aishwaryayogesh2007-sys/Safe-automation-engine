import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ao04_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('ao04_token');
      localStorage.removeItem('ao04_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

// Dashboard
export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

// Incidents
export const getIncidents = async (params = {}) => {
  const response = await api.get('/incidents', { params });
  return response.data;
};

export const getIncident = async (id) => {
  const response = await api.get(`/incidents/${id}`);
  return response.data;
};

export const createIncident = async (data) => {
  const response = await api.post('/incidents', data);
  return response.data;
};

// Runbooks
export const getRunbooks = async (params = {}) => {
  const response = await api.get('/runbooks', { params });
  return response.data;
};

export const getRunbook = async (id) => {
  const response = await api.get(`/runbooks/${id}`);
  return response.data;
};

// Remediations
export const createRemediation = async (data) => {
  const response = await api.post('/remediations', data);
  return response.data;
};

export const getRemediations = async (params = {}) => {
  const response = await api.get('/remediations', { params });
  return response.data;
};

export const getRemediation = async (id) => {
  const response = await api.get(`/remediations/${id}`);
  return response.data;
};

export const getRemediationTimeline = async (id) => {
  const response = await api.get(`/remediations/${id}/timeline`);
  return response.data;
};

// Approvals
export const getApprovals = async (params = {}) => {
  const response = await api.get('/approvals', { params });
  return response.data;
};

export const getApproval = async (id) => {
  const response = await api.get(`/approvals/${id}`);
  return response.data;
};

export const approveAction = async (id, reason = 'Approved by operator') => {
  const response = await api.post(`/approvals/${id}/approve`, {
    decision: 'approved',
    reason,
  });
  return response.data;
};

export const rejectAction = async (id, reason = 'Rejected by operator') => {
  const response = await api.post(`/approvals/${id}/reject`, {
    decision: 'rejected',
    reason,
  });
  return response.data;
};

// Audit
export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit', { params });
  return response.data;
};

// Policies
export const getPolicies = async () => {
  const response = await api.get('/policies');
  return response.data;
};

export const getKillSwitch = async () => {
  const response = await api.get('/policies/kill-switch');
  return response.data;
};

export const activateKillSwitch = async (reason) => {
  const response = await api.post('/policies/kill-switch/activate', { reason });
  return response.data;
};

export const deactivateKillSwitch = async () => {
  const response = await api.post('/policies/kill-switch/deactivate', {});
  return response.data;
};

// Simulations
export const getScenarios = async () => {
  const response = await api.get('/simulations/scenarios');
  return response.data;
};

export const triggerSimulation = async (data) => {
  const payload = {
    scenario_type: data.scenario_type,
    target: data.target || data.target_service,
    parameters: data.parameters || {},
  };
  const response = await api.post('/simulations/trigger', payload);
  return response.data;
};

// Analytics
export const getKPIs = async () => {
  const response = await api.get('/analytics/kpis');
  return response.data;
};

export default api;
