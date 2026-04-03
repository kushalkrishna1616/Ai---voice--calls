import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// Call API
export const callAPI = {
  getCalls: (params) => api.get('/calls', { params }),
  getCall: (id) => api.get(`/calls/${id}`),
  deleteCall: (id) => api.delete(`/calls/${id}`),
  simulate: (data) => api.post('/calls/simulate', data)
};

// Transcript API
export const transcriptAPI = {
  getTranscripts: (params) => api.get('/transcripts', { params }),
  getTranscript: (id) => api.get(`/transcripts/${id}`),
  getTranscriptByCallId: (callId) => api.get(`/transcripts/call/${callId}`),
  searchTranscripts: (params) => api.get('/transcripts/search', { params }),
  updateTranscript: (id, data) => api.put(`/transcripts/${id}`, data),
  deleteTranscript: (id) => api.delete(`/transcripts/${id}`),
  exportTranscript: (id) => {
    window.open(`${API_BASE_URL}/transcripts/${id}/export`, '_blank');
  }
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: (params) => api.get('/analytics/dashboard', { params }),
  getTimeSeries: (params) => api.get('/analytics/timeseries', { params }),
  getPeakHours: (params) => api.get('/analytics/peak-hours', { params }),
  getCallerInsights: (params) => api.get('/analytics/caller-insights', { params }),
  getIntentAnalysis: (params) => api.get('/analytics/intent-analysis', { params }),
  exportAnalytics: (params) => {
    const queryString = new URLSearchParams(params).toString();
    window.open(`${API_BASE_URL}/analytics/export?${queryString}`, '_blank');
  }
};

export default api;
