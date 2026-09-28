import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Box, Card, CardContent, Stack, Tab, Tabs, Typography, Chip } from '@mui/material';
import {
  ShieldCheck,
  Activity,
  Users,
  FileText,
  ShieldAlert,
  Database,
  Sparkles,
  Cpu,
  Shield,
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
];

export default function AdminPage() {
  const { userRole } = useAuth();
  const location = useLocation();

  if (userRole !== 'ADMIN') return <Navigate to='/dashboard' replace />;

  const activeTab = tabs.findIndex((tab) => location.pathname.endsWith(`/admin/${tab.to}`));

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 5,
          overflow: 'hidden',
          position: 'relative',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(232,97,26,0.22) 0%, rgba(30,27,75,0.4) 40%, rgba(18,18,21,0.98) 100%)'
              : 'linear-gradient(135deg, rgba(232,97,26,0.12) 0%, rgba(240,244,255,0.9) 50%, rgba(255,255,255,0.98) 100%)',
          border: 1,
          borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(232,97,26,0.3)' : 'rgba(232,97,26,0.18)'),
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 16px 40px -10px rgba(0,0,0,0.6)'
              : '0 16px 40px -10px rgba(232,97,26,0.08)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', lg: '1.3fr 0.7fr' },
              alignItems: 'center',
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={<Sparkles className='h-3.5 w-3.5 text-primary-500' />}
                  label='SUPERVISION BACK-OFFICE'
                  color='primary'
                  size='small'
                  sx={{ fontWeight: 800, letterSpacing: 0.8, fontSize: 11 }}
                />
                <Chip
                  icon={<Shield className='h-3.5 w-3.5 text-emerald-500' />}
                  label='Sensitive Line Active (5 000 €)'
                  size='small'
                  sx={{
                    fontWeight: 700,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(16,185,129,0.18)' : '#ecfdf5'),
                    color: 'success.main',
                    border: 1,
                    borderColor: 'success.light',
                  }}
                />
                <Chip
                  icon={<Cpu className='h-3.5 w-3.5 text-indigo-400' />}
                  label='Ollama Qwen2.5:7b'
                  size='small'
                  sx={{
                    fontWeight: 700,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.18)' : '#eef2ff'),
                    color: 'info.main',
                    border: 1,
                    borderColor: 'info.light',
                  }}
                />
              </Stack>

              <Typography variant='h4' sx={{ fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                Banking Customer Support Agent
              </Typography>
              <Typography
                variant='subtitle1'
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  letterSpacing: '-0.01em',
                }}
              >
                Assistant Client Bancaire avec IA Hybride • Centre de Contrôle & Supervision
              </Typography>

              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 740, lineHeight: 1.8 }}>
                Supervision en temps réel des flux conversationnels, validation des tâches sensibles Flowable BPMN,
                gestion de la base vectorielle pgvector (RAG) et traçabilité réglementaire pour{' '}
                <strong>FinBank International • Plateforme Bancaire de Supervision</strong>.
              </Typography>
            </Stack>

            <Box
              sx={{
                p: 2.5,
                borderRadius: 4,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: 2,
                backdropFilter: 'blur(10px)',
              }}
            >
              <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: 2, fontWeight: 700 }}>
                  Architecture Hybride
                </Typography>
                <Chip label='ONLINE' size='small' color='success' sx={{ fontWeight: 800, height: 20, fontSize: 10 }} />
              </Stack>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                3 Niveaux de Protection
              </Typography>
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6366f1' }} />
                  <Typography variant='caption' sx={{ fontWeight: 600 }}>
                    1. Détection d'intention LLM locale (Qwen2.5:7b)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                  <Typography variant='caption' sx={{ fontWeight: 600 }}>
                    2. Base documentaire RAG pgvector (PostgreSQL)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#e8611a' }} />
                  <Typography variant='caption' sx={{ fontWeight: 600 }}>
                    3. Sensitive Line & Flowable BPMN (Workflow Humain)
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>

          <Tabs
            value={activeTab >= 0 ? activeTab : 0}
            variant='scrollable'
            scrollButtons='auto'
            sx={{
              minHeight: 48,
              mt: 3.5,
              '& .MuiTabs-indicator': {
                height: 3.5,
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
                  minHeight: 48,
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 2.5,
                  fontSize: 14,
                }}
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
