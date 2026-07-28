import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ParentHome from '@/pages/ParentHome';
import AddChild from '@/pages/AddChild';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import TutorSession from '@/pages/TutorSession';
import Progress from '@/pages/Progress';

function ProtectedParent({ children }: { children: React.ReactNode }) {
  const { parent, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (!parent) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedLearner({ children }: { children: React.ReactNode }) {
  const { parent, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  if (authLoading || profileLoading) return <div className="app-loading"><div className="loader" /></div>;
  if (!parent) return <Navigate to="/login" replace />;
  if (!profile?.onboardingComplete) return <Navigate to="/parent" replace />;
  return <>{children}</>;
}

export default function App() {
  const { parent, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loader" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={parent ? <Navigate to="/parent" replace /> : <Login />} />
        <Route path="/register" element={parent ? <Navigate to="/parent" replace /> : <Register />} />
        <Route path="/parent" element={<ProtectedParent><ParentHome /></ProtectedParent>} />
        <Route path="/parent/children/new" element={<ProtectedParent><AddChild /></ProtectedParent>} />
        <Route path="/onboarding" element={<Navigate to="/parent" replace />} />
        <Route path="/dashboard" element={<ProtectedLearner><Dashboard /></ProtectedLearner>} />
        <Route path="/learn/:subject" element={<ProtectedLearner><TutorSession /></ProtectedLearner>} />
        <Route path="/progress" element={<ProtectedLearner><Progress /></ProtectedLearner>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
