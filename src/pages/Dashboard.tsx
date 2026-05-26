import { isSupabaseConfigured } from '../lib/supabase';
import { AlertTriangle } from 'lucide-react';

export default function Dashboard() {
    return (
        <div className="space-y-6">
            {!isSupabaseConfigured && (
                <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 dark:bg-yellow-900/10">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700 dark:text-yellow-200">
                                <span className="font-medium">Supabase not configured.</span>{' '}
                                Please update your <code>.env</code> file with your Supabase URL and Key to enable database features.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {['Total Applications', 'Interviews', 'Offers', 'Saved Internships'].map((stat) => (
                    <div key={stat} className="overflow-hidden rounded-xl border bg-card p-6 shadow-sm">
                        <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{stat}</dt>
                        <dd className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">0</dd>
                    </div>
                ))}
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Activity</h2>
                <p className="mt-4 text-sm text-gray-500">No recent activity.</p>
            </div>
        </div>
    );
}
