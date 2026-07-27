import { Routes, Route, Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import Home from '@/pages/Home';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import TutorSession from '@/pages/TutorSession';
import Progress from '@/pages/Progress';

export default function App() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loader" aria-label="Loading" />
      </div>
    );
  }

  const needsOnboarding = !profile?.onboardingComplete;

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/onboarding"
          element={needsOnboarding ? <Onboarding /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard />}
        />
        <Route
          path="/learn/:subject"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <TutorSession />}
        />
        <Route
          path="/progress"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Progress />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
