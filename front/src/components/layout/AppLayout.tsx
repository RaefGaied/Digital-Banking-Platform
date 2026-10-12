import { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Settings, Menu as MenuIcon } from 'lucide-react';
import Sidebar from './Sidebar.tsx';
import { useAuth } from '../../hooks/useAuth';
import Notifications from '../ui/Notifications';
import { useI18n } from '../../i18n/context';
import LanguageToggle from '../ui/LanguageToggle';
import ThemeToggle from '../ui/ThemeToggle';
import FloatingAgentWidget from '../ui/FloatingAgentWidget';

export default function AppLayout() {
  const { isAuthenticated, userName } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        overflowX: 'hidden',
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 10% 10%, rgba(232,97,26,0.12), transparent 30%), radial-gradient(circle at 90% 10%, rgba(59,130,246,0.08), transparent 28%)',
        },
      }}
    >
      {/* Sidebar with Desktop fixed bar + Mobile slide Drawer */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Main Content Area with Responsive Margin */}
      <Box
        component='main'
        sx={{
          ml: { xs: 0, lg: '96px' },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
          transition: 'margin-left 0.25s ease',
        }}
      >
        {/* Floating Glassmorphic Header */}
        <AppBar
          position='sticky'
          elevation={0}
          sx={(theme) => ({
            top: 0,
            mx: { xs: 1.5, sm: 2.5, md: 3 },
            mt: { xs: 1.5, sm: 2, md: 2.5 },
            width: 'auto',
            borderRadius: { xs: 4, md: 6 },
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: 1,
            borderColor: 'divider',
            bgcolor:
              theme.palette.mode === 'dark'
                ? 'rgba(18, 18, 21, 0.78)'
                : 'rgba(255, 255, 255, 0.82)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
                : '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            '& .MuiToolbar-root': {
              minHeight: { xs: 68, md: 84 },
            },
          })}
        >
          <Toolbar
            sx={{
              px: { xs: 2, sm: 2.5, md: 3.5 },
              py: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
            }}
          >
            {/* Left Header: Mobile Hamburger + Greetings */}
            <Stack direction='row' spacing={{ xs: 1.25, sm: 2 }} sx={{ alignItems: 'center' }}>
              {/* Hamburger Button for Mobile & Tablets (< lg) */}
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{
                  display: { xs: 'inline-flex', lg: 'none' },
                  bgcolor: 'action.hover',
                  border: 1,
                  borderColor: 'divider',
                  p: { xs: 0.75, sm: 1 },
                }}
                aria-label='Open navigation menu'
              >
                <MenuIcon className='w-5 h-5 text-primary-500' />
              </IconButton>

              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    display: 'block',
                  }}
                >
                  {getGreeting()}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1.1,
                    fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.75rem' },
                    letterSpacing: '-0.02em',
                  }}
                >
                  {userName || t('common.user')}
                </Typography>
              </Box>
            </Stack>

            {/* Right Header: Controls */}
            <Stack
              direction='row'
              spacing={{ xs: 0.75, sm: 1.25 }}
              sx={{ alignItems: 'center', flexShrink: 0 }}
            >
              <Tooltip title="Assistant Client Bancaire avec IA Hybride • Modèle Local & Traçabilité Sécurisée" arrow>
                <Box
                  onClick={() => navigate('/chat')}
                  className='cyber-shimmer'
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    alignItems: 'center',
                    gap: 1.25,
                    px: 1.8,
                    py: 0.75,
                    borderRadius: 999,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : 'rgba(232, 97, 26, 0.08)',
                    border: 1.5,
                    borderColor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(232, 97, 26, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    '&:hover': {
                      transform: 'translateY(-1px) scale(1.02)',
                      borderColor: 'primary.main',
                      boxShadow: '0 4px 16px rgba(232,97,26,0.2)',
                    },
                  }}
                >
                  {/* Mini Soundwave Equalizer */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, height: 14 }}>
                    <Box className='ai-wave-bar' sx={{ height: 10 }} />
                    <Box className='ai-wave-bar' sx={{ height: 14 }} />
                    <Box className='ai-wave-bar' sx={{ height: 8 }} />
                  </Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.01em' }}>
                    Agent IA Bancaire Actif
                  </Typography>
                </Box>
              </Tooltip>

              <LanguageToggle />
              <ThemeToggle />
              <Notifications />

              <Tooltip title={t('common.settings')}>
                <IconButton
                  onClick={() => navigate('/profile')}
                  sx={{
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 1,
                    p: { xs: 0.85, sm: 1 },
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    },
                  }}
                >
                  <Settings className='w-4.5 h-4.5' />
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Dynamic Page Container */}
        <Box
          sx={{
            flex: 1,
            px: { xs: 1.5, sm: 2.5, md: 3 },
            pb: 4,
            pt: { xs: 2, md: 3 },
          }}
        >
          <Box sx={{ maxWidth: 1600, mx: 'auto', width: '100%' }}>
            <Outlet />
          </Box>
        </Box>
      </Box>

      {/* ── PERSISTENT INTERACTIVE FLOATING AI AGENT WIDGET ── */}
      <FloatingAgentWidget />
    </Box>
  );
}
