import { NavLink, useNavigate } from 'react-router-dom';
import { Box, Divider, Stack, Paper, Tooltip, IconButton } from '@mui/material';
import { Home, CreditCard, ArrowLeftRight, TrendingUp, PieChart, User, LogOut, ShieldCheck, Activity, Users, FileText, ShieldAlert, MessageCircle, History, Bot } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n/I18nContext';

const userNavItems = [
  { to: '/dashboard', icon: Home, key: 'sidebar.home' },
  { to: '/cards', icon: CreditCard, key: 'sidebar.cards' },
  { to: '/transactions', icon: ArrowLeftRight, key: 'sidebar.transfer' },
  { to: '/invest', icon: TrendingUp, key: 'sidebar.invest' },
  { to: '/analytics', icon: PieChart, key: 'sidebar.analytics' },
  { to: '/sessions', icon: History, key: 'sidebar.sessions' },
  { to: '/agents', icon: Bot, key: 'sidebar.agents' },
  { to: '/profile', icon: User, key: 'sidebar.profile' },
  { to: '/help', icon: MessageCircle, key: 'sidebar.helpSupport' },
] as const;

const adminNavItems = [
  { to: '/admin/dashboard', icon: ShieldCheck, key: 'sidebar.admin' },
  { to: '/admin/tasks', icon: Activity, key: 'sidebar.tasks' },
  { to: '/admin/users', icon: Users, key: 'sidebar.users' },
  { to: '/admin/security', icon: ShieldAlert, key: 'sidebar.security' },
  { to: '/admin/audit', icon: FileText, key: 'sidebar.audit' },
] as const;

// icon-only nav items handled inline for modern compact layout

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, userName, userRole } = useAuth();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const items = userRole === 'ADMIN' ? adminNavItems : userNavItems;

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 96,
        height: '100vh',
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        zIndex: 1200,
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          $
        </Box>
      </Box>

      <Box sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
          {items.map(({ to, icon: Icon, key }) => (
            <Tooltip key={to} title={t(key as any)} placement='right'>
              <NavLink
                to={to}
                style={({ isActive }) => ({
                  display: 'grid',
                  placeItems: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: isActive ? '#ffffff' : 'inherit',
                  background: isActive ? 'linear-gradient(135deg, #e8611a, #ff8a3d)' : 'transparent',
                  boxShadow: isActive ? '0 12px 24px rgba(232,97,26,0.18)' : 'none',
                })}
              >
                <Icon className='w-5 h-5' />
              </NavLink>
            </Tooltip>
          ))}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <IconButton onClick={() => navigate('/profile')} sx={{ bgcolor: 'action.hover' }} title={t('sidebar.viewProfile')}>
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'primary.main', display: 'grid', placeItems: 'center', color: 'primary.contrastText', fontWeight: 700 }}>
            {userName ? getInitials(userName) : 'U'}
          </Box>
        </IconButton>

        <Tooltip title={t('sidebar.logout')}>
          <IconButton onClick={handleLogout} color='inherit'>
            <LogOut className='w-5 h-5' />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}
