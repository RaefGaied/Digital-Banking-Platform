import { NavLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Divider,
  Stack,
  Paper,
  Tooltip,
  IconButton,
  Drawer,
  Typography,
  Chip,
} from '@mui/material';
import {
  Home,
  CreditCard,
  ArrowLeftRight,
  TrendingUp,
  PieChart,
  User,
  LogOut,
  ShieldCheck,
  Activity,
  Users,
  FileText,
  ShieldAlert,
  MessageCircle,
  History,
  Bot,
  Database,
  SearchCode,
  X,
  Sparkles,
} from 'lucide-react';
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
  { to: '/rag', icon: SearchCode, key: 'sidebar.ragTest' },
  { to: '/profile', icon: User, key: 'sidebar.profile' },
  { to: '/help', icon: MessageCircle, key: 'sidebar.helpSupport' },
] as const;

const adminNavItems = [
  { to: '/admin/dashboard', icon: ShieldCheck, key: 'sidebar.admin' },
  { to: '/admin/tasks', icon: Activity, key: 'sidebar.tasks' },
  { to: '/admin/users', icon: Users, key: 'sidebar.users' },
  { to: '/admin/security', icon: ShieldAlert, key: 'sidebar.security' },
  { to: '/admin/audit', icon: FileText, key: 'sidebar.audit' },
  { to: '/admin/rag', icon: Database, key: 'sidebar.rag' },
  { to: '/rag', icon: SearchCode, key: 'sidebar.ragTest' },
] as const;

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const { logout, userName, userRole } = useAuth();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onMobileClose) onMobileClose();
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const items = userRole === 'ADMIN' ? adminNavItems : userNavItems;

  // Modern Brand Logo Mark
  const BrandLogo = () => (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)',
        display: 'grid',
        placeItems: 'center',
        color: '#ffffff',
        boxShadow: '0 8px 18px -2px rgba(232, 97, 26, 0.35)',
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)',
        },
      }}
    >
      <Sparkles className='w-5 h-5 text-white' />
    </Box>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR (>= 1024px) ── */}
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 96,
          height: '100vh',
          borderRadius: 0,
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          zIndex: 1200,
          boxShadow: '2px 0 16px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Brand Header */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <BrandLogo />
        </Box>

        {/* Navigation Items with Tooltips and Glowing Pill */}
        <Box
          sx={{
            flex: 1,
            py: 2.5,
            px: 1.5,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.25,
            '&::-webkit-scrollbar': { width: 3 },
          }}
        >
          {items.map(({ to, icon: Icon, key }) => (
            <Tooltip key={to} title={t(key as any)} placement='right' arrow>
              <NavLink
                to={to}
                style={({ isActive }) => ({
                  display: 'grid',
                  placeItems: 'center',
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  textDecoration: 'none',
                  color: isActive ? '#ffffff' : 'inherit',
                  background: isActive
                    ? 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)'
                    : 'transparent',
                  boxShadow: isActive ? '0 8px 20px -2px rgba(232, 97, 26, 0.35)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: isActive ? 1 : 0.72,
                })}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.style.background.includes('gradient')) {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.style.background.includes('gradient')) {
                    e.currentTarget.style.opacity = '0.72';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <Icon className='w-5 h-5' />
              </NavLink>
            </Tooltip>
          ))}
        </Box>

        <Divider />

        {/* User profile avatar & Logout */}
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <Tooltip title={t('sidebar.viewProfile')} placement='right' arrow>
            <IconButton
              onClick={() => navigate('/profile')}
              sx={{
                p: 0.5,
                border: 2,
                borderColor: 'primary.light',
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'scale(1.05)' },
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {userName ? getInitials(userName) : 'U'}
              </Box>
            </IconButton>
          </Tooltip>

          <Tooltip title={t('sidebar.logout')} placement='right' arrow>
            <IconButton
              onClick={handleLogout}
              sx={{
                color: 'text.secondary',
                borderRadius: 3,
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: 'error.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <LogOut className='w-5 h-5' />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* ── MOBILE / TABLET SLIDE-OUT DRAWER (< 1024px) ── */}
      <Drawer
        anchor='left'
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 290,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Drawer Header */}
          <Box
            sx={{
              p: 2.5,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
              <BrandLogo />
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  FinBank
                </Typography>
                <Chip
                  label={userRole === 'ADMIN' ? 'Admin Suite' : 'Personal Banking'}
                  size='small'
                  color={userRole === 'ADMIN' ? 'primary' : 'default'}
                  sx={{ height: 18, fontSize: 10, fontWeight: 700, mt: 0.25 }}
                />
              </Box>
            </Stack>
            <IconButton onClick={onMobileClose} size='small'>
              <X className='w-5 h-5 text-gray-500' />
            </IconButton>
          </Box>

          {/* User Preview Card */}
          <Box sx={{ p: 2, pb: 1 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {userName ? getInitials(userName) : 'U'}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }} noWrap>
                  {userName || t('common.user')}
                </Typography>
                <Typography variant='caption' color='text.secondary' noWrap>
                  {userRole}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Menu Items with text labels */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {items.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onMobileClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  color: isActive ? '#ffffff' : 'inherit',
                  background: isActive
                    ? 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)'
                    : 'transparent',
                  boxShadow: isActive ? '0 8px 18px -2px rgba(232, 97, 26, 0.35)' : 'none',
                  transition: 'all 0.2s ease',
                })}
              >
                <Icon className='w-5 h-5 shrink-0' />
                <span>{t(key as any)}</span>
              </NavLink>
            ))}
          </Box>

          <Divider />

          {/* Drawer Footer */}
          <Box sx={{ p: 2 }}>
            <Box
              component='button'
              onClick={handleLogout}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2.5,
                border: 'none',
                bgcolor: 'transparent',
                color: 'error.main',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <LogOut className='w-5 h-5' />
              <span>{t('sidebar.logout')}</span>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
