import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

type MenuItem = string | { name: string; path: string };

export const DropdownMenu = ({ title, items, isMobile = false }: { title: string, items: MenuItem[], isMobile?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);

  const renderItem = (item: MenuItem, index: number) => {
    const isLink = typeof item !== 'string';
    const key = isLink ? item.name : item;
    const text = isLink ? item.name : item;
    const path = isLink ? item.path : '#';

    const mobileClasses = "block py-1 text-sm text-gray-600 dark:text-gray-400";
    const desktopClasses = "block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700";

    if (isLink) {
      return (
        <Link key={key} to={path} className={isMobile ? mobileClasses : desktopClasses}>
          {text}
        </Link>
      );
    }
    return (
      <a key={key} href={path} className={isMobile ? mobileClasses : desktopClasses}>
        {text}
      </a>
    );
  };

  if (isMobile) {
    return (
        <div className="px-2">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-2 text-base font-medium text-gray-700 dark:text-gray-200">
                {title}
                <ChevronDown className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pl-4 pt-2 pb-1 space-y-1">
                            {items.map(renderItem)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
  }

  return (
    <div className="relative" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <button className="inline-flex items-center space-x-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
        <span>{title}</span>
        <ChevronDown className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
          >
            <div className="py-1">
              {items.map(renderItem)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
