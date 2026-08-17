import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { isLearnerRole, isParentPortalRole } from '@/lib/api';
import { homePathForRole, isAppRole, type AppRole } from '@brightpath/shared';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ParentHome from '@/pages/ParentHome';
import AddChild from '@/pages/AddChild';
import AiTutorPage from '@/pages/AiTutorPage';
import SubjectsLibraryPage from '@/pages/SubjectsLibraryPage';
import DashboardSectionRedirect from '@/pages/DashboardSectionRedirect';
import TutorSession from '@/pages/TutorSession';
import Progress from '@/pages/Progress';
import LessonModulePage from '@/pages/LessonModulePage';
import SubjectCurriculumPage from '@/pages/SubjectCurriculumPage';
import VideoLessonPage from '@/pages/VideoLessonPage';
import ChapterTestPage from '@/pages/ChapterTestPage';
import ChapterExplorePage from '@/pages/ChapterExplorePage';
import TeacherDashboard from '@/pages/TeacherDashboard';
import SchoolDashboard from '@/pages/SchoolDashboard';
import CenterDashboard from '@/pages/CenterDashboard';
import ParentPortalDashboard from '@/pages/ParentPortalDashboard';
import StudentDashboard from '@/pages/StudentDashboard';
import BrandingSettingsPage from '@/pages/BrandingSettingsPage';

function RequireRole({
  roles,
  children,
}: {
  roles: AppRole[];
  children: React.ReactNode;
}) {
  const { role, loading, homePath } = useAuth();
  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (!role || !isAppRole(role) || !roles.includes(role)) {
    return <Navigate to={homePath === '/login' ? '/login' : homePath} replace />;
  }
  return <>{children}</>;
}

function ProtectedStudent({ children }: { children: React.ReactNode }) {
  const { parent, role, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (role === 'org_admin') return <Navigate to="/admin/school-dashboard" replace />;
  if (role === 'center_admin') return <Navigate to="/admin/center-dashboard" replace />;
  if (isParentPortalRole(role)) return <Navigate to="/parent/dashboard" replace />;
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
  const { role, parent, teacher, user } = useAuth();
  if (role && isAppRole(role) && (user || parent || teacher)) {
    return <Navigate to={homePathForRole(role)} replace />;
  }
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
        <Route path="/signup" element={<Navigate to="/register" replace />} />

        <Route
          path="/admin/school-dashboard"
          element={
            <RequireRole roles={['org_admin']}>
              <SchoolDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/admin/school-dashboard/settings"
          element={
            <RequireRole roles={['org_admin', 'center_admin']}>
              <BrandingSettingsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/center-dashboard"
          element={
            <RequireRole roles={['center_admin']}>
              <CenterDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/admin/center-dashboard/settings"
          element={
            <RequireRole roles={['center_admin']}>
              <BrandingSettingsPage />
            </RequireRole>
          }
        />
        <Route
          path="/billing/success"
          element={<div className="page"><h1 className="page-title">Payment successful</h1><p className="page-subtitle">Your subscription is active. You can close this tab.</p></div>}
        />
        <Route
          path="/billing/cancel"
          element={<div className="page"><h1 className="page-title">Payment canceled</h1><p className="page-subtitle">No charges were made.</p></div>}
        />
        <Route
          path="/parent/dashboard"
          element={
            <RequireRole roles={['parent']}>
              <ParentPortalDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedStudent>
              <StudentDashboard />
            </ProtectedStudent>
          }
        />

        <Route path="/parent" element={<ProtectedStudent><ParentHome /></ProtectedStudent>} />
        <Route path="/parent/children/new" element={<ProtectedStudent><AddChild /></ProtectedStudent>} />
        <Route path="/onboarding" element={<Navigate to="/parent" replace />} />
        <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/dashboard/ai-tutor" element={<ProtectedStudent><AiTutorPage /></ProtectedStudent>} />
        <Route
          path="/dashboard/learning-path"
          element={<ProtectedStudent><DashboardSectionRedirect hash="path" /></ProtectedStudent>}
        />
        <Route
          path="/dashboard/analytics"
          element={<ProtectedStudent><DashboardSectionRedirect hash="analytics" /></ProtectedStudent>}
        />
        <Route path="/dashboard/subjects" element={<ProtectedStudent><SubjectsLibraryPage /></ProtectedStudent>} />
        <Route path="/dashboard/subjects/:subjectId" element={<ProtectedStudent><SubjectCurriculumPage /></ProtectedStudent>} />
        <Route path="/dashboard/subjects/:subjectId/videos/:videoId" element={<ProtectedStudent><VideoLessonPage /></ProtectedStudent>} />
        <Route path="/dashboard/chapters/:chapterId/test" element={<ProtectedStudent><ChapterTestPage /></ProtectedStudent>} />
        <Route path="/chapter/:id/explore" element={<ProtectedStudent><ChapterExplorePage /></ProtectedStudent>} />
        <Route path="/lesson/:nodeId" element={<ProtectedStudent><LessonModulePage /></ProtectedStudent>} />
        <Route path="/learn/:subject" element={<ProtectedLearner><TutorSession /></ProtectedLearner>} />
        <Route path="/progress" element={<ProtectedStudent><Progress /></ProtectedStudent>} />
        <Route path="/teacher/dashboard" element={<ProtectedTeacher><TeacherDashboard /></ProtectedTeacher>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
