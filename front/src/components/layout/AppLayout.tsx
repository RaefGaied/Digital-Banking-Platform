import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Stack, IconButton } from '@mui/material';
import { Settings } from 'lucide-react';
import Sidebar from './Sidebar.tsx';
import { useAuth } from '../../hooks/useAuth';
import Notifications from '../ui/Notifications';
import { useI18n } from '../../i18n/I18nContext';
import LanguageToggle from '../ui/LanguageToggle';
import ThemeToggle from '../ui/ThemeToggle';

export default function AppLayout() {
  const { isAuthenticated, userName } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to='/login' replace />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetings.morning');
    if (hour < 18) return t('greetings.afternoon');
    return t('greetings.evening');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at top left, rgba(232,97,26,0.16), transparent 32%), radial-gradient(circle at top right, rgba(59,130,246,0.10), transparent 24%)',
        },
      }}
    >
      <Sidebar />
      <Box component='main' sx={{ ml: '96px', position: 'relative', zIndex: 1 }}>
        <AppBar
          position='sticky'
          elevation={0}
          color='transparent'
          sx={{
            top: 0,
            mx: 3,
            mt: 3,
            width: 'calc(100% - 24px)',
            borderRadius: 8,
            backdropFilter: 'blur(12px)',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.85)',
            boxShadow: '0 6px 18px rgba(15,15,15,0.04)',
            '& .MuiToolbar-root': {
              minHeight: 104,
            },
          }}
        >
          <Toolbar sx={{ px: { xs: 2.5, md: 4 }, py: 1.75, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant='body2' color='text.secondary' sx={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {getGreeting()}
              </Typography>
              <Typography variant='h4' sx={{ fontWeight: 900, lineHeight: 1.05 }}>
                {userName || t('common.user')}
              </Typography>
            </Box>
            <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <LanguageToggle />
              <ThemeToggle />
              <Notifications />
              <IconButton
                onClick={() => navigate('/profile')}
                sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', boxShadow: 1 }}
                title={t('common.settings')}
              >
                <Settings className='w-5 h-5' />
              </IconButton>
            </Stack>
          </Toolbar>
        </AppBar>
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 4, pt: 3 }}>
          <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
          <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
