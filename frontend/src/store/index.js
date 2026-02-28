import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    user: null,
    token: localStorage.getItem('access_token'),
    isAuthenticated: !!localStorage.getItem('access_token'),

    setAuth: (user, token, refreshToken) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, token, isAuthenticated: true });
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, token: null, isAuthenticated: false });
    },

    setUser: (user) => set({ user }),
}));

export const useEmergencyStore = create((set, get) => ({
    emergencies: [],
    activeEmergency: null,
    liveCount: 0,

    addEmergency: (emergency) => set((state) => ({
        emergencies: [emergency, ...state.emergencies].slice(0, 200),
        liveCount: state.liveCount + 1,
    })),

    setEmergencies: (emergencies) => set({ emergencies }),
    setActiveEmergency: (emergency) => set({ activeEmergency: emergency }),

    updateEmergency: (id, updates) => set((state) => ({
        emergencies: state.emergencies.map((e) =>
            e.id === id ? { ...e, ...updates } : e
        ),
    })),
}));

export const useResourceStore = create((set) => ({
    resources: [],
    availability: null,

    setResources: (resources) => set({ resources }),
    setAvailability: (availability) => set({ availability }),

    updateResource: (id, updates) => set((state) => ({
        resources: state.resources.map((r) =>
            r.id === id ? { ...r, ...updates } : r
        ),
    })),
}));

export const useUIStore = create((set) => ({
    sidebarCollapsed: false,
    activeTab: 'dashboard',
    notifications: [],
    wsConnected: false,

    setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setWsConnected: (v) => set({ wsConnected: v }),

    addNotification: (notification) => set((state) => ({
        notifications: [
            { ...notification, id: Date.now(), timestamp: new Date() },
            ...state.notifications,
        ].slice(0, 50),
    })),

    clearNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
