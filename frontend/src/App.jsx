import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import EmergenciesPage from './pages/EmergenciesPage';
import ResourcesPage from './pages/ResourcesPage';
import DispatchPage from './pages/DispatchPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DemoPage from './pages/DemoPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
      gcTime: 60000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/emergencies" element={<EmergenciesPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/dispatch" element={<DispatchPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
