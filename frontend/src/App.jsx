import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LiveRiskMapPage from './pages/LiveRiskMapPage';
import ForecastTimelinePage from './pages/ForecastTimelinePage';
import PredictorPage from './pages/PredictorPage';
import PostLearningPage from './pages/PostLearningPage';
import ResilienceScorecardPage from './pages/ResilienceScorecardPage';
import RealTimeMonitorPage from './pages/RealTimeMonitorPage';
import ResearchPage from './pages/ResearchPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LiveRiskMapPage />} />
          <Route path="forecast" element={<ForecastTimelinePage />} />
          <Route path="predictor" element={<PredictorPage />} />
          <Route path="post-learning" element={<PostLearningPage />} />
          <Route path="scorecard" element={<ResilienceScorecardPage />} />
          <Route path="telemetry" element={<RealTimeMonitorPage />} />
          <Route path="research" element={<ResearchPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
