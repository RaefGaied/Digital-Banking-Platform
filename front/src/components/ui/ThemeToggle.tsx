import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className='inline-flex items-center gap-2 rounded-full bg-cream-50 px-3 py-1.5 shadow-sm transition-all hover:shadow-md'
      aria-label={t('theme.toggle')}>
      {theme === 'dark' ? (
        <>
          <Sun className='h-4 w-4 text-primary-500' />
          <span className='text-xs font-medium text-dark-800'>{t('theme.light')}</span>
        </>
      ) : (
        <>
          <Moon className='h-4 w-4 text-primary-500' />
          <span className='text-xs font-medium text-dark-800'>{t('theme.dark')}</span>
        </>
      )}
    </button>
  );
}
