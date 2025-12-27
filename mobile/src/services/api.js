import axios from 'axios';
import { storage } from './storage';

// API Base URL - Update this IP address if your computer's IP changes
// For Expo, environment variables from .env may not load properly
// You can also set EXPO_PUBLIC_API_URL in .env and restart Expo
const API_BASE_URL = 'http://192.168.101.45:3000/api';

// Alternative: Use environment variable if available
// const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.101.45:3000/api';

// Log API URL for debugging (only in development)
if (__DEV__) {
  console.log('API Base URL:', API_BASE_URL);
}

// Token getter function - can be set from outside (e.g., from Redux store)
let tokenGetter = null;

// Function to set token getter (for Redux store access)
export const setTokenGetter = (getter) => {
  tokenGetter = getter;
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Try to get token from storage first
      let token = await storage.getToken();
      
      // If storage doesn't have token, try Redux store (if tokenGetter is set)
      if (!token && tokenGetter) {
        try {
          const reduxState = tokenGetter();
          token = reduxState?.auth?.token || null;
        } catch (e) {
          // Ignore errors from tokenGetter
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Log warning if token is missing (only in development)
        if (__DEV__) {
          console.warn('[API] No token found in storage or Redux for request:', config.url);
        }
      }
    } catch (error) {
      console.error('[API] Error getting token:', error);
      // Continue without token - backend will return 401 if needed
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const is401 = status === 401;
    const is429 = status === 429; // Rate limit error
    const url = error.config?.url || '';
    
    // Suppress error logging for expected 401s on these endpoints (handled by screens)
    const endpointsToSuppress = [
      '/auth/',
      '/users',
      '/reports/',
      '/approvals/',
      '/diary',
      '/departments',
      '/tasks',
      '/notifications',
    ];
    
    const shouldSuppressLog = is401 && endpointsToSuppress.some(endpoint => url.includes(endpoint));

    // Handle 429 (Rate Limit) errors gracefully
    if (is429) {
      const errorMessage = error.response?.data || 'Too many requests, please try again later.';
      // Don't log 429 errors as they're expected when rate limits are hit
      // Just return a user-friendly error
      const rateLimitError = new Error(typeof errorMessage === 'string' ? errorMessage : 'Too many requests, please try again later.');
      rateLimitError.response = error.response;
      rateLimitError.isRateLimit = true;
      return Promise.reject(rateLimitError);
    }

    if (!shouldSuppressLog) {
      // Log error details for debugging (except expected 401s and 429s)
      if (error.response) {
        // Server responded with error status
        console.error('API Error Response:', {
          status: error.response.status,
          data: error.response.data,
          url: url
        });
      } else if (error.request) {
        // Request was made but no response received
        console.error('API Network Error:', {
          message: error.message,
          url: url,
          baseURL: error.config?.baseURL
        });
      } else {
        // Error setting up request
        console.error('API Request Setup Error:', error.message);
      }
    }

    if (is401) {
      // Token expired or invalid - clear storage
      try {
        await storage.clearAll();
      } catch (e) {
        console.error('Error clearing storage:', e);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  getCurrentUser: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),
};

// Department API
export const departmentAPI = {
  getDepartments: () => apiClient.get('/departments'),
  createDepartment: (departmentData) => apiClient.post('/departments', departmentData),
  updateDepartment: (departmentId, departmentData) => apiClient.patch(`/departments/${departmentId}`, departmentData),
  deleteDepartment: (departmentId) => apiClient.delete(`/departments/${departmentId}`),
};

// User API
export const userAPI = {
  getUsers: () => apiClient.get('/users'),
  getUserById: (userId) => apiClient.get(`/users/${userId}`),
  createUser: (userData) => apiClient.post('/users', userData),
  updateUser: (userId, userData) => apiClient.patch(`/users/${userId}`, userData),
  getUsersForAssignment: (params) => apiClient.get('/users/for-assignment', { params }),
};

// Task API
export const taskAPI = {
  getTasks: (params) => apiClient.get('/tasks', { params }),
  getTaskById: (taskId) => apiClient.get(`/tasks/${taskId}`),
  createTask: (taskData) => apiClient.post('/tasks', taskData),
  updateTask: (taskId, taskData) => apiClient.patch(`/tasks/${taskId}`, taskData),
  deleteTask: (taskId) => apiClient.delete(`/tasks/${taskId}`),
  addTaskUpdate: (taskId, updateData) => apiClient.post(`/tasks/${taskId}/updates`, updateData),
  addReplyToUpdate: (taskId, updateId, message) => apiClient.post(`/tasks/${taskId}/updates/${updateId}/reply`, { message }),
  approveHod: (taskId) => apiClient.post(`/tasks/${taskId}/approve-hod`),
  approveDirector: (taskId) => apiClient.post(`/tasks/${taskId}/approve-director`),
  reopenTask: (taskId) => apiClient.post(`/tasks/${taskId}/reopen`),
};

// Approval API
export const approvalAPI = {
  getPendingApprovals: () => apiClient.get('/approvals/pending'),
  approveTask: (taskId) => apiClient.post(`/approvals/${taskId}/approve`),
  rejectTask: (taskId) => apiClient.post(`/approvals/${taskId}/reject`),
};

// Report API
export const reportAPI = {
  getStats: (params) => apiClient.get('/reports/stats', { params }),
  getTasksByDepartment: () => apiClient.get('/reports/by-department'),
  getUserPerformance: () => apiClient.get('/reports/user-performance'),
};

// Diary API
export const diaryAPI = {
  getDiaryEntries: (params) => apiClient.get('/diary', { params }),
  getTodayTasks: () => apiClient.get('/diary/today'),
  getDiaryById: (id) => apiClient.get(`/diary/${id}`),
  createDiary: (diaryData) => apiClient.post('/diary', diaryData),
  updateDiary: (id, diaryData) => apiClient.patch(`/diary/${id}`, diaryData),
  deleteDiary: (id) => apiClient.delete(`/diary/${id}`),
};

export default apiClient;

