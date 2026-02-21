import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  exchangeSession: async (sessionId: string) => {
    const response = await api.post('/auth/session', { session_id: sessionId });
    if (response.data.user) {
      // Store token for native mobile
      const sessionToken = response.headers['set-cookie']?.find(c => c.includes('session_token'));
      if (sessionToken) {
        const tokenValue = sessionToken.split(';')[0].split('=')[1];
        await AsyncStorage.setItem('session_token', tokenValue);
      }
    }
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    await AsyncStorage.removeItem('session_token');
    return response.data;
  },
};

// User Profile API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  
  updateProfile: async (data: {
    company_name?: string;
    business_type?: string;
    employee_count?: number;
    industry?: string;
  }) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },
};

// Health Check API
export const healthCheckAPI = {
  getQuestions: async () => {
    const response = await api.get('/health-check/questions');
    return response.data;
  },
  
  submit: async (responses: { question_id: string; answer: boolean; notes?: string }[]) => {
    const response = await api.post('/health-check/submit', { responses });
    return response.data;
  },
  
  getHistory: async () => {
    const response = await api.get('/health-check/history');
    return response.data;
  },
  
  getLatest: async () => {
    const response = await api.get('/health-check/latest');
    return response.data;
  },
};

// Document API
export const documentAPI = {
  upload: async (file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    
    const token = await AsyncStorage.getItem('session_token');
    const response = await axios.post(`${BACKEND_URL}/api/documents/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  },
  
  list: async () => {
    const response = await api.get('/documents');
    return response.data;
  },
  
  get: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  },
  
  analyze: async (documentId: string) => {
    const response = await api.post(`/documents/${documentId}/analyze`);
    return response.data;
  },
  
  delete: async (documentId: string) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },
};

// Risk Register API
export const riskRegisterAPI = {
  generate: async (data: { business_type: string; industry?: string }) => {
    const response = await api.post('/risk-register/generate', data);
    return response.data;
  },
  
  get: async () => {
    const response = await api.get('/risk-register');
    return response.data;
  },
  
  updateRisk: async (riskId: string, data: { status: string; notes?: string }) => {
    const response = await api.put(`/risk-register/${riskId}`, data);
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  get: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },
};

// Subscription API
export const subscriptionAPI = {
  get: async () => {
    const response = await api.get('/subscription');
    return response.data;
  },
  
  getPlans: async () => {
    const response = await api.get('/subscription/plans');
    return response.data;
  },
};

export default api;
