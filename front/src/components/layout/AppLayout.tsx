import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { Settings } from 'lucide-react';
import Notifications from '../ui/Notifications';
import { useI18n } from '../../i18n/I18nContext';
import ThemeToggle from '../ui/ThemeToggle';

export default function AppLayout() {
  const { isAuthenticated, userName } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to='/login' replace />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetings.morning');
    if (hour < 18) return t('greetings.afternoon');
    return t('greetings.evening');
  };

  return (
    <div className='flex min-h-screen bg-cream-100'>
      <Sidebar />
      <main className='flex-1 ml-64'>
        <header className='flex items-center justify-between px-8 py-6'>
          <div>
            <p className='text-gray-400 text-sm'>{getGreeting()}</p>
            <h1 className='text-2xl font-bold text-dark-800'>{userName || t('common.user')}</h1>
          </div>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2 bg-cream-50 rounded-full px-3 py-1.5 shadow-sm'>
              <span className='text-xs text-gray-500'>{t('common.language')}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as 'en' | 'fr')}
                className='text-xs font-medium text-dark-800 bg-transparent focus:outline-none cursor-pointer'>
                <option value='en'>{t('common.english')}</option>
                <option value='fr'>{t('common.french')}</option>
              </select>
            </div>
            <ThemeToggle />
            <Notifications />
            <button
              onClick={() => navigate('/profile')}
              className='w-10 h-10 rounded-full bg-cream-50 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow'
              title={t('common.settings')}>
              <Settings className='w-5 h-5 text-gray-400' />
            </button>
          </div>
        </header>
        <div className='px-8 pb-8'>
          <Outlet />
        </div>
      </main>
    </div>
  );
}