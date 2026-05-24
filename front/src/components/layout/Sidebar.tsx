import { NavLink, useNavigate } from 'react-router-dom';
import { Home, CreditCard, ArrowLeftRight, TrendingUp, PieChart, User, HelpCircle, LogOut, ShieldCheck, Activity, Users, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n/I18nContext';

const navItems = [
  { to: '/dashboard', icon: Home, key: 'sidebar.home' },
  { to: '/cards', icon: CreditCard, key: 'sidebar.cards' },
  { to: '/transactions', icon: ArrowLeftRight, key: 'sidebar.transfer' },
  { to: '/invest', icon: TrendingUp, key: 'sidebar.invest' },
  { to: '/analytics', icon: PieChart, key: 'sidebar.analytics' },
  { to: '/profile', icon: User, key: 'sidebar.profile' },
] as const;

// const adminNavItem = { to: '/admin', icon: ShieldCheck, key: 'sidebar.admin' } as const;

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, userName, userRole } = useAuth();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const adminOnlyNav = [
    { to: '/admin/dashboard', icon: ShieldCheck, key: 'sidebar.admin' },
    { to: '/admin/tasks', icon: Activity, key: 'sidebar.tasks' },
    { to: '/admin/users', icon: Users, key: 'sidebar.users' },
    { to: '/admin/audit', icon: FileText, key: 'sidebar.audit' },
    { to: '/help', icon: HelpCircle, key: 'sidebar.helpSupport' },
  ];

  return (
    <aside className='fixed left-0 top-0 h-full w-64 bg-cream-50 flex flex-col z-50 shadow-sm'>
      <div className='p-6 border-b border-cream-200'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center'>
            <span className='text-white font-bold text-lg'>$</span>
          </div>
          <div>
            <h1 className='font-bold text-dark-800 text-lg leading-none'>FinBank</h1>
            <p className='text-xs text-gray-400 mt-0.5'>{t('sidebar.digitalBanking')}</p>
          </div>
        </div>
      </div>

      <nav className='flex-1 p-4 space-y-1'>
        {(userRole === 'ADMIN' ? adminOnlyNav : navItems).map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50'
              }`
            }
          >
            <Icon className='w-5 h-5' />
            {t(key as any)}
          </NavLink>
        ))}
      </nav>

      <div className='p-4 border-t border-cream-200 space-y-1'>
        <NavLink to='/help'
          className={({ isActive }) =>
            `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
              isActive
                ? 'bg-primary-500 text-white'
                : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50'
            }`
          }
        >
          <HelpCircle className='w-5 h-5' />
          {t('sidebar.helpSupport')}
        </NavLink>

        {/* User Avatar */}
        <button onClick={() => navigate('/profile')}
          className='w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cream-100 transition-all'>
          <div className='w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center shrink-0'>
            <span className='text-white text-xs font-bold'>
              {userName ? getInitials(userName) : 'U'}
            </span>
          </div>
          <div className='flex-1 min-w-0 text-left'>
            <p className='text-sm font-medium text-dark-800 truncate'>{userName || t('common.user')}</p>
            <p className='text-xs text-gray-400'>{t('sidebar.viewProfile')}</p>
          </div>
        </button>

        <button onClick={handleLogout}
          className='w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all text-sm font-medium'>
          <LogOut className='w-5 h-5' />
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  );
}