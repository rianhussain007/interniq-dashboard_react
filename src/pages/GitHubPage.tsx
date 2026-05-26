import React from 'react';
import { GithubTracker } from '../components/GitHubTracker';

const GitHubPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">GitHub Activity Tracker</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">Enter a GitHub username to see their contribution stats and top repositories.</p>
      <GithubTracker />
    </div>
  );
};

export default GitHubPage;
