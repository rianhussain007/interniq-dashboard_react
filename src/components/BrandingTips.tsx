import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Zap, TrendingUp, Github, Linkedin } from 'lucide-react';
import { cn } from '../lib/utils';

const tipsData = {
  github: [
    { title: 'Pin Your Best Repositories', description: 'Showcase your top projects on your profile.', difficulty: 'Easy', time: '5 mins', category: 'Profile' },
    { title: 'Create a Profile README', description: 'Use a README to introduce yourself and your skills.', difficulty: 'Medium', time: '1 hour', category: 'Profile' },
  ],
  linkedin: [
    { title: 'Customize Your URL', description: 'A custom URL looks more professional.', difficulty: 'Easy', time: '2 mins', category: 'Profile' },
    { title: 'Get Recommendations', description: 'Ask colleagues or professors for recommendations.', difficulty: 'Medium', time: '30 mins', category: 'Networking' },
  ],
  quickWins: [
    { title: 'Add a Professional Headshot', description: 'A clear, professional photo builds trust.', difficulty: 'Easy', time: '15 mins', category: 'Profile' },
    { title: 'Update Your Contact Info', description: 'Make it easy for recruiters to reach you.', difficulty: 'Easy', time: '5 mins', category: 'Profile' },
  ],
};

const TipCard = ({ tip }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tip.title}</h3>
    <p className="text-gray-600 dark:text-gray-400 mt-2">{tip.description}</p>
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-300">
      <span>{tip.difficulty}</span>
      <span>{tip.time}</span>
      <span>{tip.category}</span>
    </div>
  </div>
);

const tabs = [
  { id: 'github', name: 'GitHub Tips', icon: Github },
  { id: 'linkedin', name: 'LinkedIn Tips', icon: Linkedin },
  { id: 'quickWins', name: 'Quick Wins', icon: Zap },
];

export const BrandingTips = () => {
  const [activeTab, setActiveTab] = useState('github');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Personal Branding Tips</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Elevate your professional presence online.</p>
        </header>

        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-full">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300',
                  activeTab === tab.id ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                )}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {tipsData[activeTab].map(tip => (
              <TipCard key={tip.title} tip={tip} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
