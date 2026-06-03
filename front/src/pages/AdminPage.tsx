import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Box, Card, CardContent, Stack, Tab, Tabs, Typography, Chip } from '@mui/material';
import { ShieldCheck, Activity, Users, FileText, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const tabs = [
  { to: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
  { to: 'tasks', label: 'Tasks', icon: Activity },
  { to: 'users', label: 'Users', icon: Users },
  { to: 'security', label: 'Security', icon: ShieldAlert },
  { to: 'audit', label: 'Audit', icon: FileText },
] as const;

export default function AdminPage() {
  const { userRole } = useAuth();
  const location = useLocation();

  if (userRole !== 'ADMIN') return <Navigate to='/dashboard' replace />;

  const activeTab = tabs.findIndex(tab => location.pathname.endsWith(`/admin/${tab.to}`));

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 5,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(232,97,26,0.12), rgba(255,255,255,0.96))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' }, alignItems: 'center' }}>
            <Stack spacing={1.25}>
              <Chip label='Administration' color='primary' sx={{ width: 'fit-content', fontWeight: 700 }} />
              <Typography variant='h4' sx={{ fontWeight: 900, lineHeight: 1.05 }}>
                Control center
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760, lineHeight: 1.8 }}>
                Manage service operations, users, tasks, and audit history from one place with a layout built for daily operations.
              </Typography>
            </Stack>

            <Box
              sx={{
                p: 2.5,
                borderRadius: 4,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: 1,
              }}
            >
              <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: 2 }}>
                Workspace
              </Typography>
              <Typography variant='h6' sx={{ fontWeight: 800, mt: 0.5 }}>
                Admin operations hub
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                Use the tabs below to switch between workflow, user control, and audit visibility.
              </Typography>
            </Box>
          </Box>

          <Tabs
            value={activeTab >= 0 ? activeTab : 0}
            variant='scrollable'
            scrollButtons='auto'
            sx={{
              minHeight: 44,
              mt: 3,
              '& .MuiTabs-indicator': { height: 3, borderRadius: 999 },
            }}
          >
            {tabs.map(({ to, label, icon: Icon }) => (
              <Tab
                key={to}
                component={NavLink}
                to={to}
                label={label}
                icon={<Icon className='h-4 w-4' />}
                iconPosition='start'
                sx={{ minHeight: 44, textTransform: 'none', fontWeight: 700, px: 2.2 }}
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Box>
        <Outlet />
      </Box>
    </Stack>
  );
}
