import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, FileCheck, Bookmark, Settings, LogOut } from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Internships', href: '/internships', icon: Briefcase },
    { name: 'Applications', href: '/applications', icon: FileCheck },
    { name: 'Saved', href: '/saved', icon: Bookmark },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    return (
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                    <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">InternIQ</span>
                </div>
                <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                            <ul role="list" className="-mx-2 space-y-1">
                                {navigation.map((item) => (
                                    <li key={item.name}>
                                        <NavLink
                                            to={item.href}
                                            className={({ isActive }) =>
                                                `group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 ${isActive
                                                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
                                                    : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                                                }`
                                            }
                                        >
                                            <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                            {item.name}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </li>
                        <li className="mt-auto">
                            <a
                                href="#"
                                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                            >
                                <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                                Sign out
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
