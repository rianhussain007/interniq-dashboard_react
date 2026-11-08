import { lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import GuideBot from './components/GuideBot';

const HomePage = lazy(() => import('./pages/HomePage'));
const InternshipsPage = lazy(() => import('./pages/InternshipsPage'));
const BrandingTipsPage = lazy(() => import('./pages/BrandingTipsPage'));
const GitHubTrackerPage = lazy(() => import('./pages/GitHubTrackerPage'));
const ResumeAnalyzerPage = lazy(() => import('./pages/ResumeAnalyzerPage'));
const ProfileSetupPage = lazy(() => import('./pages/ProfileSetupPage'));
const LoginPage = lazy(() => import('./pages/Login'));
const Applications = lazy(() => import('./pages/Applications'));
const Saved = lazy(() => import('./pages/Saved'));
const ResumeBuilderPage = lazy(() => import('./pages/ResumeBuilderPage'));
const ResumeScannerPage = lazy(() => import('./pages/ResumeScannerPage'));
const ResumeTemplatesPage = lazy(() => import('./pages/ResumeTemplatesPage'));
const InterviewPrepPage = lazy(() => import('./pages/InterviewPrepPage'));
const NetworkingPage = lazy(() => import('./pages/NetworkingPage'));
const SalaryGuidePage = lazy(() => import('./pages/SalaryGuidePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const AlertSettingsPage = lazy(() => import('./pages/AlertSettingsPage'));

// ProtectedRoute component to guard authenticated routes
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Public route that redirects to dashboard if user is already logged in
const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500" role="status">Loading…</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const HomeRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return isAuthenticated ? <HomePage /> : <Navigate to="/internships" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    } />

    {/* Protected Routes */}
    <Route path="/" element={<HomeRoute />} />

    <Route path="/internships" element={<InternshipsPage />} />

    <Route path="/branding-tips" element={
      <ProtectedRoute>
        <BrandingTipsPage />
      </ProtectedRoute>
    } />

    <Route path="/github-tracker" element={
      <ProtectedRoute>
        <GitHubTrackerPage />
      </ProtectedRoute>
    } />

    <Route path="/resume-analyzer" element={
      <ProtectedRoute>
        <ResumeAnalyzerPage />
      </ProtectedRoute>
    } />

    <Route path="/profile-setup" element={
      <ProtectedRoute>
        <ProfileSetupPage />
      </ProtectedRoute>
    } />

    <Route path="/applications" element={
      <ProtectedRoute>
        <Applications />
      </ProtectedRoute>
    } />

    <Route path="/saved" element={
      <ProtectedRoute>
        <Saved />
      </ProtectedRoute>
    } />

    {/* Browser-local career tools are available without an account. */}
    <Route path="/resume-builder" element={<ResumeBuilderPage />} />
    <Route path="/resume-scanner" element={<ResumeScannerPage />} />
    <Route path="/resume-templates" element={<ResumeTemplatesPage />} />
    <Route path="/interview-prep" element={<InterviewPrepPage />} />
    <Route path="/networking" element={<NetworkingPage />} />
    <Route path="/salary-guide" element={<SalaryGuidePage />} />
    <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
    <Route path="/settings/alerts" element={<ProtectedRoute><AlertSettingsPage /></ProtectedRoute>} />

    {/* Fallback route */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
          <Navbar />
          <main>
            <Suspense
              fallback={
                <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500" role="status">
                  Loading InternIQ…
                </div>
              }
            >
              <AppRoutes />
            </Suspense>
          </main>
          <GuideBot />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
