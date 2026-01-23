import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { DashboardV2 as Dashboard } from './pages/dashboard-v2/page';
import { CipVariance } from './pages/cip-variance/page';
import { RiskQueue } from './pages/risk-queue/page';
import { BidSolicitations } from './pages/bid-solicitations/page';

const App = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="cip" element={<CipVariance />} />
            <Route path="risks" element={<RiskQueue />} />
            <Route path="bids" element={<BidSolicitations />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
