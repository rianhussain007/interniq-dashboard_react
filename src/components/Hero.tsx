import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export const Hero = () => {
  const features = [
    'Track internship opportunities',
    'Analyze your GitHub activity',
    'Improve your resume',
    'Learn how to stand out on LinkedIn & GitHub',
  ];

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4"
        >
          Welcome to <span className="text-indigo-600 dark:text-indigo-400">InternIQ</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8"
        >
          Your smart dashboard for internship and portfolio readiness.
        </motion.p>
        
        <motion.div 
          className="my-12"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <img 
            src="/assets/home_banner.png" 
            alt="InternIQ Home Banner" 
            className="max-w-sm md:max-w-md mx-auto rounded-lg shadow-2xl"
          />
        </motion.div>

        <div className="mt-12 text-left max-w-2xl mx-auto">
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                className="flex items-start"
              >
                <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                <span>{feature}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
