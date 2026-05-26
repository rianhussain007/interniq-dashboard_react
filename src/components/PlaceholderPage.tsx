import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description = 'This page is under development and will be available soon.',
  children,
  className
}) => {
  return (
    <div className={cn("min-h-[calc(100vh-8rem)] flex items-center justify-center", className)}>
      <div className="max-w-2xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          {description}
        </p>
        {children || (
          <div className="mt-10">
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go back home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceholderPage;
