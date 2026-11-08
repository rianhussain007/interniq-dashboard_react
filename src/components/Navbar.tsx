import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Moon, Sun, Menu, X, User as UserIcon, LogOut, Bell } from 'lucide-react';
import logo from '../../assets/favicon_interniq.png';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';

type NotificationItem = { id: string; kind: string; title: string; body: string; link: string; read_at: string | null; created_at: string };
type NotificationFeed = { items: NotificationItem[]; unread_count: number };

// A utility function to combine class names
import { cn } from '../lib/utils';
import { DropdownMenu } from './DropdownMenu';

// Main Navbar Component
export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchParams] = useSearchParams();
  const routeQuery = searchParams.get('q') ?? '';
  const [searchQuery, setSearchQuery] = useState(routeQuery);
  const { user, logout, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    let active = true;
    let timer: number | undefined;
    const loadNotifications = async () => {
      let nextPollMs = 60_000;
      try {
        const preferences = await apiRequest<{ frequency_minutes: number }>('/api/notifications/preferences');
        nextPollMs = preferences.frequency_minutes === 0
          ? 60_000
          : Math.max(60_000, preferences.frequency_minutes * 60_000);
      } catch {
        // Keep the navbar usable if preferences cannot be loaded; retry in a minute.
      }
      try {
        const feed = await apiRequest<NotificationFeed>('/api/notifications');
        if (!active) return;
        setNotifications(feed.items);
        setUnreadCount(feed.unread_count);
      } catch {
        // Alerts are supplemental; a transient failure should not disrupt navigation.
      }
      if (active) timer = window.setTimeout(loadNotifications, nextPollMs);
    };
    const handleSettingsUpdated = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      void loadNotifications();
    };
    void loadNotifications();
    window.addEventListener('interniq:alerts-settings-updated', handleSettingsUpdated);
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('interniq:alerts-settings-updated', handleSettingsUpdated);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isNotifOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isNotifOpen]);

  const markNotificationsRead = () => {
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    void apiRequest('/api/notifications/read', { method: 'POST' }).catch(() => undefined);
  };
  
  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setIsMenuOpen(false);
    navigate(`/internships?q=${encodeURIComponent(query)}`);
  };

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

  useEffect(() => {
    setSearchQuery(routeQuery);
  }, [routeQuery]);

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
        'sticky top-0 z-50 w-full border-b transition-all duration-300',
        isDarkMode
          ? isScrolled
            ? 'border-gray-800 bg-gray-900/90 shadow-sm backdrop-blur-lg'
            : 'border-gray-800 bg-gray-900'
          : isScrolled
            ? 'border-gray-200 bg-white/90 shadow-sm backdrop-blur-lg'
            : 'border-gray-100 bg-white'
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
          <div className="hidden lg:flex lg:items-center lg:space-x-6">
            <DropdownMenu 
              title="Resume Tools" 
              items={[
                { name: 'Builder', path: '/resume-builder' },
                { name: 'Scanner', path: '/resume-scanner' },
                { name: 'Templates', path: '/resume-templates' }
              ]} 
            />
            <DropdownMenu 
              title="Career Tips" 
              items={[
                { name: 'Interview Prep', path: '/interview-prep' },
                { name: 'Networking', path: '/networking' },
                { name: 'Salary Guide', path: '/salary-guide' }
              ]} 
            />
            <DropdownMenu 
              title="Dashboard" 
              items={[
                { name: 'Internships', path: '/internships' },
                { name: 'Applications', path: '/applications' },
                { name: 'Saved', path: '/saved' },
                { name: 'Branding Tips', path: '/branding-tips' },
                { name: 'GitHub Tracker', path: '/github-tracker' },
                { name: 'Resume Analyzer', path: '/resume-analyzer' },
                { name: 'Profile Setup', path: '/profile-setup' },
                { name: 'Community & Events', path: '/community' },
                { name: 'Alert Settings', path: '/settings/alerts' }
              ]} 
            />
            <form role="search" onSubmit={handleSearch} className="relative">
              <label htmlFor="desktop-internship-search" className="sr-only">Search internships</label>
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                aria-label="Search internships"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 disabled:cursor-not-allowed"
              >
                <Search className="h-5 w-5" />
              </button>
              <input
                id="desktop-internship-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search internships..."
                className="w-64 pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </form>
          </div>

          {/* Right Section: User & Theme Toggle */}
          <div className="hidden lg:flex items-center space-x-4">
            {isAuthenticated && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                  aria-expanded={isNotifOpen}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {isNotifOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800" role="dialog" aria-label="Notifications">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                      <p className="text-sm font-semibold">Notifications</p>
                      {unreadCount > 0 && (
                        <button type="button" onClick={markNotificationsRead} className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No alerts yet. Add skills in Profile setup to get internship matches and deadline reminders.</p>
                      ) : (
                        notifications.slice(0, 8).map((item) => (
                          <Link
                            key={item.id}
                            to={item.link || '/internships'}
                            onClick={() => setIsNotifOpen(false)}
                            className={`block border-b border-gray-50 px-4 py-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 ${item.read_at ? 'opacity-70' : ''}`}
                          >
                            <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.body}</p>
                          </Link>
                        ))
                      )}
                    </div>
                    <Link
                      to="/settings/alerts"
                      onClick={() => setIsNotifOpen(false)}
                      className="block px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-gray-50 dark:text-indigo-300 dark:hover:bg-gray-700"
                    >
                      Alert settings →
                    </Link>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || 'User'}
                      className="h-8 w-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                    </div>
                  )}
                  <span className="hidden lg:inline">{user?.name || 'Account'}</span>
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center space-x-3">
                        {user?.picture ? (
                          <img
                            src={user.picture}
                            alt={user.name || 'User'}
                            className="h-10 w-10 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user?.email || ''}
                          </p>
                        </div>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile-setup"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          role="menuitem"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <UserIcon className="h-4 w-4" />
                          <span>Profile setup</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          role="menuitem"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
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
            className="lg:hidden bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <DropdownMenu 
                title="Resume Tools" 
                items={[
                  { name: 'Builder', path: '/resume-builder' },
                  { name: 'Scanner', path: '/resume-scanner' },
                  { name: 'Templates', path: '/resume-templates' }
                ]} 
                isMobile 
              />
              <DropdownMenu 
                title="Career Tips" 
                items={[
                  { name: 'Interview Prep', path: '/interview-prep' },
                  { name: 'Networking', path: '/networking' },
                  { name: 'Salary Guide', path: '/salary-guide' }
                ]} 
                isMobile 
              />
              <DropdownMenu 
                title="Dashboard" 
                items={[
                  { name: 'Internships', path: '/internships' },
                  { name: 'Applications', path: '/applications' },
                  { name: 'Saved', path: '/saved' },
                  { name: 'Community & Events', path: '/community' },
                  { name: 'Branding Tips', path: '/branding-tips' },
                  { name: 'GitHub Tracker', path: '/github-tracker' },
                  { name: 'Resume Analyzer', path: '/resume-analyzer' },
                  { name: 'Profile Setup', path: '/profile-setup' },
                  { name: 'Alert Settings', path: '/settings/alerts' }
                ]} 
                isMobile 
              />
              <form role="search" onSubmit={handleSearch} className="relative px-2 pt-2">
                <label htmlFor="mobile-internship-search" className="sr-only">Search internships</label>
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  aria-label="Search internships"
                  className="absolute left-5 top-[calc(50%+0.25rem)] -translate-y-1/2 text-gray-400 disabled:cursor-not-allowed"
                >
                  <Search className="h-5 w-5" />
                </button>
                <input
                  id="mobile-internship-search"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search internships..."
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </form>
              <div className="px-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between gap-3 px-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {user?.picture ? (
                        <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                          <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                        </span>
                      )}
                      <span className="truncate text-sm font-medium">{user?.name || 'Account'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block rounded-lg px-4 py-2 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  >
                    Sign in / Sign up
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
