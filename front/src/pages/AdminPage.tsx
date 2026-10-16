import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Box, Stack, Tab, Tabs, Typography, Chip } from '@mui/material';
import {
  ShieldCheck,
  Activity,
  Users,
  FileText,
  ShieldAlert,
  Database,
  Banknote,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AdminTabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const tabs: AdminTabItem[] = [
  { to: 'dashboard', label: 'Dashboard', icon: ShieldCheck, badge: 'Live' },
  { to: 'tasks', label: 'Flowable Tasks', icon: Activity, badge: 'BPMN' },
  { to: 'users', label: 'Users & Roles', icon: Users },
  { to: 'security', label: 'Security Events', icon: ShieldAlert },
  { to: 'audit', label: 'Audit Trail', icon: FileText },
  { to: 'rag', label: 'RAG Knowledge', icon: Database, badge: 'pgvector' },
  { to: 'atm', label: 'ATM Cash Desk', icon: Banknote, badge: 'SIM' },
];

export default function AdminPage() {
  const { userRole } = useAuth();
  const location = useLocation();

  if (userRole !== 'ADMIN') return <Navigate to='/dashboard' replace />;

  const activeTab = tabs.findIndex((tab) => location.pathname.endsWith(`/admin/${tab.to}`));

  return (
    <Stack spacing={2.5}>
      {/* Enterprise Executive Header Bar */}
      <Box
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px -2px rgba(232, 97, 26, 0.35)',
                }}
              >
                <ShieldCheck className='w-5 h-5 text-white' />
              </Box>
              <Box>
                <Typography variant='h5' sx={{ fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Administration & Back-Office
                </Typography>
                <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
                  Portail d’administration institutionnel · Contrôle des flux, sécurité et conformité
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip
              icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', ml: 1 }} />}
              label='Système Opérationnel'
              size='small'
              sx={{ fontWeight: 700, fontSize: 11, bgcolor: 'action.hover' }}
            />
            <Chip
              label='Sensitive Line : 5 000 €'
              size='small'
              color='primary'
              variant='outlined'
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
            <Chip
              label='BPMN Flowable 6.8'
              size='small'
              sx={{ fontWeight: 700, fontSize: 11, bgcolor: 'action.hover' }}
            />
          </Stack>
        </Box>

        {/* Clean Enterprise Navigation Tabs */}
        <Tabs
          value={activeTab >= 0 ? activeTab : 0}
          variant='scrollable'
          scrollButtons='auto'
          sx={{
            minHeight: 44,
            borderTop: 1,
            borderColor: 'divider',
            pt: 0.5,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 999,
              bgcolor: 'primary.main',
            },
          }}
        >
          {tabs.map(({ to, label, icon: Icon, badge }) => (
            <Tab
              key={to}
              component={NavLink}
              to={to}
              label={
                <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                  <span>{label}</span>
                  {badge && (
                    <Chip
                      label={badge}
                      size='small'
                      sx={{
                        height: 18,
                        fontSize: 10,
                        fontWeight: 800,
                        bgcolor: 'action.hover',
                      }}
                    />
                  )}
                </Stack>
              }
              icon={<Icon className='h-4 w-4' />}
              iconPosition='start'
              sx={{
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 700,
                px: 2.2,
                fontSize: 13.5,
              }}
            />
          ))}
        </Tabs>
      </Box>

      <Box>
        <Outlet />
      </Box>
    </Stack>
  );
}
