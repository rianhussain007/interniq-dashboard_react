import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Moon, Sun, Menu, X, ChevronDown } from 'lucide-react';
import logo from '../../assets/favicon_interniq.png';

// A utility function to combine class names
import { cn } from '../lib/utils';
import { DropdownMenu } from './DropdownMenu';

// Main Navbar Component
export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Effect to handle scroll and dark mode
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);

    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toggle dark mode
  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
    setIsDarkMode(!isDarkMode);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled ? 'bg-white/80 dark:bg-black/80 backdrop-blur-lg shadow-md' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Branding */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 text-2xl font-bold text-gray-900 dark:text-white">
              <img src={logo} alt="InternIQ Logo" className="h-8 w-8" />
              <span>InternIQ</span>
            </Link>
          </div>

          {/* Center Section: Navigation Links & Search (Desktop) */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <DropdownMenu title="Resume Tools" items={['Builder', 'Scanner', 'Templates']} />
            <DropdownMenu title="Career Tips" items={['Interview Prep', 'Networking', 'Salary Guide']} />
            <DropdownMenu title="Dashboard" items={[
                { name: 'Internships', path: '/internships' },
                { name: 'Branding Tips', path: '/branding-tips' },
                { name: 'GitHub Tracker', path: '/github-tracker' },
                { name: 'Resume Analyzer', path: '/resume-analyzer' },
                { name: 'Profile Setup', path: '/profile-setup' }
            ]} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Right Section: Actions (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700">
              Upgrade
            </button>
            <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Sign In / Sign Up</Link>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
             <button onClick={toggleTheme} className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-gray-600 dark:text-gray-300">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <DropdownMenu title="Resume Tools" items={['Builder', 'Scanner', 'Templates']} isMobile />
              <DropdownMenu title="Career Tips" items={['Interview Prep', 'Networking', 'Salary Guide']} isMobile />
              <DropdownMenu title="Dashboard" items={[
                { name: 'Internships', path: '/internships' },
                { name: 'Branding Tips', path: '/branding-tips' },
                { name: 'GitHub Tracker', path: '/github-tracker' },
                { name: 'Resume Analyzer', path: '/resume-analyzer' },
                { name: 'Profile Setup', path: '/profile-setup' }
              ]} isMobile />
              <div className="relative px-2 pt-2">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                 <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="px-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700">Upgrade</button>
                <Link to="/login" className="block text-center mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">Sign In / Sign Up</Link>
                <div className="mt-4 flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    <span className="ml-2 text-sm">User Profile</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};


