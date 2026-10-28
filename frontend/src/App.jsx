import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import Runbooks from './pages/Runbooks';
import RunbookDetail from './pages/RunbookDetail';
import Remediations from './pages/Remediations';
import RemediationDetail from './pages/RemediationDetail';
import Approvals from './pages/Approvals';
import AuditLogs from './pages/AuditLogs';
import SimulationLab from './pages/SimulationLab';
import SafetyPolicies from './pages/SafetyPolicies';
import Analytics from './pages/Analytics';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Guard (redirects authenticated users away from /login)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected Application Routes wrapped in Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/runbooks" element={<Runbooks />} />
          <Route path="/runbooks/:id" element={<RunbookDetail />} />
          <Route path="/remediations" element={<Remediations />} />
          <Route path="/remediations/:id" element={<RemediationDetail />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/simulation" element={<SimulationLab />} />
          <Route path="/safety" element={<SafetyPolicies />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
