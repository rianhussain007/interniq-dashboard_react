import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Briefcase } from 'lucide-react';

// Define the shape of an internship object for TypeScript
interface Internship {
  id: string;
  title: string;
  company: string;
  location: string;
  stipend: string;
  apply_link: string;
  source: 'LinkedIn' | 'Internshala' | 'Naukri';
}




const InternshipCard = ({ internship }: { internship: Internship }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
    <div className="flex-grow">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{internship.title}</h3>
        <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${internship.source === 'LinkedIn' ? 'bg-blue-600' : 'bg-teal-500'}`}>
          {internship.source}
        </span>
      </div>
      <p className="text-md text-indigo-600 dark:text-indigo-400 font-semibold mt-1">{internship.company}</p>
      <div className="flex items-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{internship.location}</span>
      </div>
      <div className="flex items-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
        <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{internship.stipend || 'Not Disclosed'}</span>
      </div>
    </div>
    <a 
      href={internship.apply_link}
      target="_blank" 
      rel="noopener noreferrer"
      className="block text-center w-full mt-6 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-300"
    >
      Apply Now
    </a>
  </div>
);

export const InternshipFeed = () => {
  const [allInternships, setAllInternships] = useState<Internship[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a hardcoded URL to bypass TypeScript issues with import.meta.env
  const apiBaseUrl = 'http://localhost:8001';

  useEffect(() => {
    const fetchInternships = async () => {
      try {
        setLoading(true);
        console.log('Fetching internships from:', `${apiBaseUrl}/api/internships`);
        
        // Add cache-busting parameter to avoid cached responses
        const timestamp = new Date().getTime();
        const response = await fetch(`${apiBaseUrl}/api/internships?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'  // Important for CORS with credentials if needed
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        setAllInternships(data);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to fetch internships:", err);
        const errorMessage = err instanceof Error
          ? err.message
          : 'Failed to load internships. Please check your connection and try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchInternships();
  }, [apiBaseUrl]);

  const filteredInternships = useMemo(() => {
    return allInternships.filter(internship => {
      const matchesSearch = internship.title.toLowerCase().includes(searchTerm.toLowerCase()) || internship.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = location ? internship.location.toLowerCase().includes(location.toLowerCase()) : true;
      const matchesSource = source !== 'All' ? internship.source === source : true;
      return matchesSearch && matchesLocation && matchesSource;
    });
  }, [searchTerm, location, source, allInternships]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Find Your Next Internship</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Your journey to a dream career starts here.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="md:w-1/4">
            <div className="sticky top-24 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-6">Filters</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keyword Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="search"
                      placeholder="Title, company..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    id="location"
                    placeholder="City, state, remote..."
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source</label>
                  <select
                    id="source"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option>All</option>
                    <option>Internshala</option>
                    <option>LinkedIn</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Internship Listings */}
          <main className="md:w-3/4">
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 px-4">
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Failed to Load Internships</h2>
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left max-w-2xl mx-auto">
                  <p className="font-medium">Error Details:</p>
                  <pre className="mt-2 p-3 bg-white dark:bg-gray-800 rounded overflow-auto text-sm">
                    {JSON.stringify({
                      error: error || 'Unknown error',
                      apiUrl: `${apiBaseUrl}/api/internships`,
                      timestamp: new Date().toISOString()
                    }, null, 2)}
                  </pre>
                </div>
                <div className="mt-6 space-y-2">
                  <p className="font-medium">Troubleshooting Steps:</p>
                  <ol className="list-decimal list-inside text-left max-w-md mx-auto space-y-1">
                    <li>Make sure the backend server is running</li>
                    <li>Check if you can access the API directly: <a href={`${apiBaseUrl}/api/internships`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Open API</a></li>
                    <li>Verify the API URL in your .env file is correct</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredInternships.length > 0 ? (
                  filteredInternships.map(internship => (
                    <InternshipCard key={internship.id} internship={internship} />
                  ))
                ) : (
                  <div className="lg:col-span-2 text-center py-12">
                    <h3 className="text-xl font-semibold">No Internships Found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your filters to find more opportunities.</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
