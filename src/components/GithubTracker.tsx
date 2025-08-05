import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Star, GitFork, Code, Users, Building } from 'lucide-react';

// Define interfaces for the data shape from GitHub API
interface GithubUser {
  avatar_url: string;
  name: string;
  login: string;
  bio: string;
  followers: number;
  following: number;
  company: string | null;
  repos_url: string;
}

interface GithubRepo {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

export const GithubTracker = () => {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState<GithubUser | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchGithubData = async () => {
    if (!username) return;
    setLoading(true);
    setError('');
    setUserData(null);
    setRepos([]);

    try {
      const userResponse = await fetch(`https://api.github.com/users/${username}`);
      if (!userResponse.ok) throw new Error('User not found');
      const userData = await userResponse.json();
      setUserData(userData);

      const reposResponse = await fetch(userData.repos_url);
      const reposData = await reposResponse.json();
      setRepos(reposData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">GitHub Profile Tracker</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Analyze your GitHub presence and track your progress.</p>
        </header>

        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter a GitHub username..."
              className="flex-grow px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={fetchGithubData}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        </div>

        {userData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md flex flex-col md:flex-row items-center gap-8">
              <img src={userData.avatar_url} alt={`${userData.name}'s avatar`} className="w-32 h-32 rounded-full" />
              <div>
                <h2 className="text-3xl font-bold">{userData.name}</h2>
                <p className="text-xl text-gray-500 dark:text-gray-400">@{userData.login}</p>
                <p className="mt-2">{userData.bio}</p>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <span className="flex items-center"><Users className="mr-1 h-4 w-4" /> {userData.followers} followers</span>
                  <span className="flex items-center">·</span>
                  <span className="flex items-center">{userData.following} following</span>
                  {userData.company && <><span className="flex items-center">·</span><span className="flex items-center"><Building className="mr-1 h-4 w-4" /> {userData.company}</span></>}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-2xl font-bold mb-4">Repositories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {repos.slice(0, 6).map(repo => (
                  <div key={repo.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">{repo.name}</a>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{repo.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="flex items-center"><Star className="mr-1 h-4 w-4" /> {repo.stargazers_count}</span>
                      <span className="flex items-center"><GitFork className="mr-1 h-4 w-4" /> {repo.forks_count}</span>
                      {repo.language && <span className="flex items-center"><Code className="mr-1 h-4 w-4" /> {repo.language}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};


