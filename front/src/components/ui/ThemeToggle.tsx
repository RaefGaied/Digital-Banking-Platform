import { DarkMode, LightMode } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <Tooltip title={t('theme.toggle')}>
      <Button
        type='button'
        onClick={toggleTheme}
        variant='outlined'
        size='small'
        aria-label={t('theme.toggle')}
        startIcon={theme === 'dark' ? <LightMode fontSize='small' /> : <DarkMode fontSize='small' />}
        sx={{
          borderRadius: 999,
          textTransform: 'none',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
          px: 1.75,
          py: 0.9,
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        {theme === 'dark' ? t('theme.light') : t('theme.dark')}
      </Button>
    </Tooltip>
  );
}
