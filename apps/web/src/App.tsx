import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { isLearnerRole, isParentPortalRole } from '@/lib/api';
import { homePathForRole, isAppRole, type AppRole } from '@brightpath/shared';
import Home from '@/pages/Home';
import SharadaChat from '@/pages/SharadaChat';
import Landing from '@/pages/Landing';
import PricingPage from '@/pages/PricingPage';
import Login from '@/pages/Auth/Login';
import { CyberLayout } from '@/components/layout/CyberLayout';
import { CYBER_FONT_STYLE } from '@/lib/theme';
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
import CurriculumTextbookStudio from '@/pages/tools/CurriculumTextbookStudio';
import TeacherTools from '@/pages/TeacherTools';
import TeacherToolPage from '@/pages/TeacherToolPage';
import SongGeneratorDashboard from '@/pages/TeacherTools/SongGeneratorDashboard';
import SongGeneratorCreate from '@/pages/TeacherTools/SongGeneratorCreate';
import LessonPlanGenerator from '@/pages/TeacherTools/LessonPlanGenerator';
import TeacherChapterManagePage from '@/pages/TeacherChapterManagePage';
import SchoolDashboard from '@/pages/SchoolDashboard';
import OwnerDashboard from '@/pages/admin/OwnerDashboard';
import CenterDashboard from '@/pages/CenterDashboard';
import ParentPortalDashboard from '@/pages/ParentPortalDashboard';
import StudentDashboard from '@/pages/StudentDashboard';
import BrandingSettingsPage from '@/pages/BrandingSettingsPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import SecurityOverview from '@/pages/SecurityOverview';
import CookiePreferences from '@/pages/CookiePreferences';
import ContactUs from '@/pages/ContactUs';

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
  if (role === 'teacher') return <Navigate to="/home" replace />;
  if (role === 'org_admin') return <Navigate to="/admin/school-dashboard" replace />;
  if (role === 'center_admin') return <Navigate to="/tutor-center" replace />;
  if (isParentPortalRole(role)) return <Navigate to="/parent/dashboard" replace />;
  if (!parent || !isLearnerRole(role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedTeacher({ children }: { children: React.ReactNode }) {
  const { teacher, role, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (role === 'center_admin' || role === 'org_admin') return <>{children}</>;
  if (role !== 'teacher' || !teacher) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Interactive chapter stage — teachers (preview) and learners */
function ProtectedChapterExplore({ children }: { children: React.ReactNode }) {
  const { parent, teacher, role, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (role === 'teacher' && teacher) return <>{children}</>;
  if (parent && isLearnerRole(role)) return <>{children}</>;
  if (role === 'org_admin') return <Navigate to="/admin/school-dashboard" replace />;
  if (role === 'center_admin') return <Navigate to="/tutor-center" replace />;
  if (isParentPortalRole(role)) return <Navigate to="/parent/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

function ProtectedLearner({ children }: { children: React.ReactNode }) {
  const { parent, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  if (authLoading || profileLoading) return <div className="app-loading"><div className="loader" /></div>;
  if (!parent) return <Navigate to="/login" replace />;
  if (!profile?.onboardingComplete) return <Navigate to="/parent" replace />;
  return <>{children}</>;
}

function RedirectSharadaChat() {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: '/chat/sharada', search: location.search, hash: location.hash }}
      replace
      state={location.state}
    />
  );
}

function LoginGate() {
  const { role, parent, teacher, user } = useAuth();
  if (role && isAppRole(role) && (user || parent || teacher)) {
    return <Navigate to={homePathForRole(role)} replace />;
  }
  return <Login />;
}

function RootHome() {
  const { role, teacher } = useAuth();
  if (role === 'teacher' && teacher) return <Home />;
  return <Landing />;
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading min-h-screen" style={CYBER_FONT_STYLE}>
        <div className="loader" aria-label="Loading" />
      </div>
    );
  }

  return (
    <CyberLayout>
    <div className="app min-h-screen" style={CYBER_FONT_STYLE}>
      <Routes>
        <Route path="/" element={<RootHome />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route
          path="/home"
          element={
            <ProtectedTeacher>
              <Home />
            </ProtectedTeacher>
          }
        />
        <Route
          path="/chat/sharada"
          element={
            <ProtectedTeacher>
              <SharadaChat />
            </ProtectedTeacher>
          }
        />
        <Route path="/chat/raina" element={<RedirectSharadaChat />} />
        <Route path="/login" element={<LoginGate />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/security" element={<SecurityOverview />} />
        <Route path="/cookie-preferences" element={<CookiePreferences />} />
        <Route path="/contact" element={<ContactUs />} />

        <Route
          path="/admin/dashboard"
          element={
            <RequireRole roles={['org_admin']}>
              <OwnerDashboard />
            </RequireRole>
          }
        />
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
            <RequireRole roles={['center_admin', 'org_admin']}>
              <CenterDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/tutor-center"
          element={
            <RequireRole roles={['center_admin', 'org_admin']}>
              <CenterDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/academy"
          element={
            <RequireRole roles={['center_admin', 'org_admin']}>
              <CenterDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/admin/center-dashboard/settings"
          element={
            <RequireRole roles={['center_admin', 'org_admin']}>
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
        <Route path="/chapter/:id/explore" element={<ProtectedChapterExplore><ChapterExplorePage /></ProtectedChapterExplore>} />
        <Route path="/lesson/:nodeId" element={<ProtectedStudent><LessonModulePage /></ProtectedStudent>} />
        <Route path="/learn/:subject" element={<ProtectedLearner><TutorSession /></ProtectedLearner>} />
        <Route path="/progress" element={<ProtectedStudent><Progress /></ProtectedStudent>} />
        <Route path="/tools/curriculum-textbook-studio" element={<ProtectedTeacher><CurriculumTextbookStudio /></ProtectedTeacher>} />
        <Route path="/teacher/dashboard" element={<ProtectedTeacher><Navigate to="/tools/curriculum-textbook-studio" replace /></ProtectedTeacher>} />
        <Route path="/teacher/tools" element={<ProtectedTeacher><TeacherTools /></ProtectedTeacher>} />
        <Route path="/teacher/tools/song-generator/new" element={<ProtectedTeacher><SongGeneratorCreate /></ProtectedTeacher>} />
        <Route path="/teacher/tools/song-generator" element={<ProtectedTeacher><SongGeneratorDashboard /></ProtectedTeacher>} />
        <Route path="/teacher/tools/lesson-plan-generator" element={<ProtectedTeacher><LessonPlanGenerator /></ProtectedTeacher>} />
        <Route path="/teacher/tools/:toolId" element={<ProtectedTeacher><TeacherToolPage /></ProtectedTeacher>} />
        <Route
          path="/teacher/chapter/:id"
          element={
            <ProtectedTeacher>
              <TeacherChapterManagePage />
            </ProtectedTeacher>
          }
        />
        <Route
          path="/teacher/chapter/:id/manage"
          element={
            <ProtectedTeacher>
              <TeacherChapterManagePage />
            </ProtectedTeacher>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    </CyberLayout>
  );
}
