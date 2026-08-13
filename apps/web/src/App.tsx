import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { isLearnerRole } from '@/lib/api';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ParentHome from '@/pages/ParentHome';
import AddChild from '@/pages/AddChild';
import Dashboard from '@/pages/Dashboard';
import AiTutorPage from '@/pages/AiTutorPage';
import SubjectsLibraryPage from '@/pages/SubjectsLibraryPage';
import DashboardSectionRedirect from '@/pages/DashboardSectionRedirect';
import TutorSession from '@/pages/TutorSession';
import Progress from '@/pages/Progress';
import LessonModulePage from '@/pages/LessonModulePage';
import SubjectCurriculumPage from '@/pages/SubjectCurriculumPage';
import VideoLessonPage from '@/pages/VideoLessonPage';
import ChapterTestPage from '@/pages/ChapterTestPage';
import TeacherDashboard from '@/pages/TeacherDashboard';

function ProtectedParent({ children }: { children: React.ReactNode }) {
  const { parent, role, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (!parent || !isLearnerRole(role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedTeacher({ children }: { children: React.ReactNode }) {
  const { teacher, role, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (role !== 'teacher' || !teacher) return <Navigate to="/login" replace />;
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

function LoginGate() {
  const { parent, teacher, role } = useAuth();
  if (role === 'teacher' && teacher) return <Navigate to="/teacher/dashboard" replace />;
  if (parent && isLearnerRole(role)) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

export default function App() {
  const { loading } = useAuth();

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
        <Route path="/login" element={<LoginGate />} />
        <Route path="/register" element={<Register />} />
        <Route path="/parent" element={<ProtectedParent><ParentHome /></ProtectedParent>} />
        <Route path="/parent/children/new" element={<ProtectedParent><AddChild /></ProtectedParent>} />
        <Route path="/onboarding" element={<Navigate to="/parent" replace />} />
        <Route path="/dashboard" element={<ProtectedParent><Dashboard /></ProtectedParent>} />
        <Route path="/dashboard/ai-tutor" element={<ProtectedParent><AiTutorPage /></ProtectedParent>} />
        <Route
          path="/dashboard/learning-path"
          element={<ProtectedParent><DashboardSectionRedirect hash="path" /></ProtectedParent>}
        />
        <Route
          path="/dashboard/analytics"
          element={<ProtectedParent><DashboardSectionRedirect hash="analytics" /></ProtectedParent>}
        />
        <Route path="/dashboard/subjects" element={<ProtectedParent><SubjectsLibraryPage /></ProtectedParent>} />
        <Route path="/dashboard/subjects/:subjectId" element={<ProtectedParent><SubjectCurriculumPage /></ProtectedParent>} />
        <Route path="/dashboard/subjects/:subjectId/videos/:videoId" element={<ProtectedParent><VideoLessonPage /></ProtectedParent>} />
        <Route path="/dashboard/chapters/:chapterId/test" element={<ProtectedParent><ChapterTestPage /></ProtectedParent>} />
        <Route path="/lesson/:nodeId" element={<ProtectedParent><LessonModulePage /></ProtectedParent>} />
        <Route path="/learn/:subject" element={<ProtectedLearner><TutorSession /></ProtectedLearner>} />
        <Route path="/progress" element={<ProtectedParent><Progress /></ProtectedParent>} />
        <Route path="/teacher/dashboard" element={<ProtectedTeacher><TeacherDashboard /></ProtectedTeacher>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
