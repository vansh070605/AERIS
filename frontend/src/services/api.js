import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const { data } = await axios.post(`${API_BASE}/auth/refresh`, null, {
                        params: { refresh_token: refreshToken },
                    });
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    original.headers.Authorization = `Bearer ${data.access_token}`;
                    return api(original);
                } catch {
                    localStorage.clear();
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// === Auth ===
export const login = (username, password) =>
    api.post('/auth/login', new URLSearchParams({ username, password }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// === Emergencies ===
export const reportEmergency = (data) => api.post('/emergency/report', data);
export const getEmergency = (id) => api.get(`/emergency/${id}`);
export const listEmergencies = (params) => api.get('/emergencys', { params });
export const updateEmergencyStatus = (id, status) =>
    api.patch(`/emergency/${id}/status`, null, { params: { new_status: status } });
export const submitCrowdReport = (data) => api.post('/emergency/crowd-report', data);

// === Resources ===
export const listResources = (params) => api.get('/resources', { params });
export const getResource = (id) => api.get(`/resources/${id}`);
export const getResourceAvailability = () => api.get('/resources/availability');
export const createResource = (data) => api.post('/resources', data);
export const updateResource = (id, data) => api.patch(`/resources/${id}`, data);

// === Dispatch ===
export const dispatch = (data) => api.post('/dispatch', data);
export const getDispatchLog = (id) => api.get(`/dispatch/${id}`);
export const listDispatchLogs = (params) => api.get('/dispatch', { params });
export const completeDispatch = (id, actualTime) =>
    api.patch(`/dispatch/${id}/complete`, null, { params: { actual_time_min: actualTime } });

// === Analytics ===
export const getHeatmap = (params) => api.get('/analytics/heatmap', { params });
export const getEquity = () => api.get('/analytics/equity');
export const getDashboardStats = () => api.get('/analytics/dashboard');
export const getResponseTimes = (params) => api.get('/analytics/response-times', { params });
export const getEarlyWarnings = () => api.get('/analytics/early-warning');

export default api;
