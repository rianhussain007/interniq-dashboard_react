import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, DollarSign, Calendar } from 'lucide-react';

// Define type locally or import from types file
type Internship = {
    id: string;
    title: string;
    company: string;
    location: string;
    stipend: string;
    link: string;
    posted_date: string;
};

export default function Internships() {
    const [internships, setInternships] = useState<Internship[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInternships();
    }, []);

    const fetchInternships = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('internships')
                .select('*')
                .order('posted_date', { ascending: false });

            if (error) throw error;
            setInternships(data || []);
        } catch (error) {
            console.error('Error fetching internships:', error);
            // Fallback/Mock data if DB is empty or fails
            setInternships([
                {
                    id: '1', title: 'Software Engineer Intern', company: 'TechCorp', location: 'Remote', stipend: '₹20,000/month', link: '#', posted_date: '2023-10-25'
                },
                {
                    id: '2', title: 'Product Design Intern', company: 'DesignStudio', location: 'Bangalore', stipend: '₹15,000/month', link: '#', posted_date: '2023-10-24'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Internships</h1>
                {/* Filter/Sort controls will go here */}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                    {internships.map((job) => (
                        <div key={job.id} className="group relative flex flex-col gap-y-3 rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                                        <a href={job.link} target="_blank" rel="noreferrer">
                                            <span className="absolute inset-0" />
                                            {job.title}
                                        </a>
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{job.company}</p>
                                </div>
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                    New
                                </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-x-1">
                                    <MapPin className="h-4 w-4" />
                                    {job.location}
                                </div>
                                <div className="flex items-center gap-x-1">
                                    <DollarSign className="h-4 w-4" />
                                    {job.stipend}
                                </div>
                                <div className="flex items-center gap-x-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(job.posted_date || Date.now()).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
