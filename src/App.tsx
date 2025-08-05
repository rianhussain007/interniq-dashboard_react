import React from 'react';
import { Navbar } from './components/Navbar';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import page components
import HomePage from './pages/HomePage';
import InternshipsPage from './pages/InternshipsPage';
import BrandingTipsPage from './pages/BrandingTipsPage';
import GitHubTrackerPage from './pages/GitHubTrackerPage';
import ResumeAnalyzerPage from './pages/ResumeAnalyzerPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import LoginPage from './pages/Login';

function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <main className="pt-16"> {/* Add padding to avoid content being hidden behind the sticky navbar */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/internships" element={<InternshipsPage />} />
            <Route path="/branding-tips" element={<BrandingTipsPage />} />
            <Route path="/github-tracker" element={<GitHubTrackerPage />} />
            <Route path="/resume-analyzer" element={<ResumeAnalyzerPage />} />
                        <Route path="/profile-setup" element={<ProfileSetupPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
