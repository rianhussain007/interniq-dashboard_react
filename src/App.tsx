import React from 'react';
import { Navbar } from './components/Navbar';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import page components
import HomePage from './pages/HomePage';
import InternshipsPage from './pages/InternshipsPage';
import BrandingTipsPage from './pages/BrandingTipsPage';
import GitHubTrackerPage from './pages/GitHubTrackerPage';
import ResumeAnalyzerPage from './pages/ResumeAnalyzerPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import LoginPage from './pages/Login';

// New page components
import ResumeBuilderPage from './pages/ResumeBuilderPage';
import ResumeScannerPage from './pages/ResumeScannerPage';
import ResumeTemplatesPage from './pages/ResumeTemplatesPage';
import InterviewPrepPage from './pages/InterviewPrepPage';
import NetworkingPage from './pages/NetworkingPage';
import SalaryGuidePage from './pages/SalaryGuidePage';

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
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    } />

    {/* Protected Routes */}
    <Route path="/" element={
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    } />

    <Route path="/internships" element={
      <ProtectedRoute>
        <InternshipsPage />
      </ProtectedRoute>
    } />

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

    {/* Resume Tools Routes */}
    <Route path="/resume-builder" element={
      <ProtectedRoute>
        <ResumeBuilderPage />
      </ProtectedRoute>
    } />

    <Route path="/resume-scanner" element={
      <ProtectedRoute>
        <ResumeScannerPage />
      </ProtectedRoute>
    } />

    <Route path="/resume-templates" element={
      <ProtectedRoute>
        <ResumeTemplatesPage />
      </ProtectedRoute>
    } />

    {/* Career Tips Routes */}
    <Route path="/interview-prep" element={
      <ProtectedRoute>
        <InterviewPrepPage />
      </ProtectedRoute>
    } />

    <Route path="/networking" element={
      <ProtectedRoute>
        <NetworkingPage />
      </ProtectedRoute>
    } />

    <Route path="/salary-guide" element={
      <ProtectedRoute>
        <SalaryGuidePage />
      </ProtectedRoute>
    } />

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
            <AppRoutes />
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
