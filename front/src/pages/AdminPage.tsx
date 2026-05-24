import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { ShieldCheck, Activity, Users, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function AdminPage() {
  const { userRole } = useAuth();

  if (userRole !== 'ADMIN') return <Navigate to='/dashboard' replace />;

  const tabs = [
    { to: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
    { to: 'tasks', label: 'Tâches', icon: Activity },
    { to: 'users', label: 'Utilisateurs', icon: Users },
    { to: 'audit', label: 'Audit', icon: FileText },
  ];

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold text-dark-800'>Administration</h1>
        <nav className='flex gap-2'>
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-cream-50'}`}>
              <Icon className='w-4 h-4' /> {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div>
        <Outlet />
      </div>
    </div>
  );
}