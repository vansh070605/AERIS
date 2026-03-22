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

// === Flood Incidents ===
export const reportFloodIncident = (data) => api.post('/flood/report', data);
export const getFloodIncident = (id) => api.get(`/flood/${id}`);
export const listFloodIncidents = (params) => api.get('/floods', { params });
export const submitCrowdReport = (data) => api.post('/flood/crowd-report', data);

// Legacy aliases
export const reportEmergency = reportFloodIncident;
export const getEmergency = getFloodIncident;
export const listEmergencies = listFloodIncidents;

// === Resources ===
export const listResources = (params) => api.get('/resources', { params });
export const getResource = (id) => api.get(`/resources/${id}`);
export const getResourceAvailability = () => api.get('/dispatch/availability');
export const createResource = (data) => api.post('/resources', data);
export const updateResource = (id, data) => api.put(`/resources/${id}`, data);
export const getAllocationMatrix = () => api.get('/resources/allocation-matrix');

// === Dispatch ===
export const listDispatchLogs = (params) => api.get('/dispatch/logs', { params });
export const dispatch = (data) => api.post('/dispatch', data);
export const optimalDispatch = () => api.post('/dispatch/optimal');
export const evacuateDispatch = (data) => api.post('/dispatch/evacuate', data);
export const completeDispatch = (id, actualTime) =>
    api.post(`/dispatch/${id}/complete`, null, { params: { actual_time_min: actualTime } });

// === Shelters ===
export const listShelters = () => api.get('/shelters');
export const getShelter = (id) => api.get(`/shelters/${id}`);
export const updateShelterOccupancy = (id, occupancy) =>
    api.put(`/shelters/${id}/occupancy`, { current_occupancy: occupancy });

// === Flood Simulation ===
export const startSimulation = (params) => api.post('/simulation/start', params);
export const getSimulationStatus = () => api.get('/simulation/status');
export const getSimulationRoadBlocks = () => api.get('/simulation/road-blocks');
export const getSimulationWaterLevels = () => api.get('/simulation/water-levels');
export const resetSimulation = () => api.post('/simulation/reset');

// === Flood Analytics ===
export const getFloodHeatmap = (params) => api.get('/analytics/flood-heatmap', { params });
export const getResponseEfficiency = (params) => api.get('/analytics/response-efficiency', { params });
export const getResourceUtilization = () => api.get('/analytics/resource-utilization');
export const getZoneRisk = () => api.get('/analytics/zone-risk');
export const getFloodTimeline = (params) => api.get('/analytics/flood-timeline', { params });
export const getDashboardStats = () => api.get('/analytics/dashboard');
export const getPostEventAnalysis = (params) => api.get('/analytics/post-event-analysis', { params });
export const updateRiskScores = (params) => api.post('/analytics/update-risk-scores', { params });

// Legacy aliases
export const getHeatmap = getFloodHeatmap;
export const getEquity = getZoneRisk;

export default api;
