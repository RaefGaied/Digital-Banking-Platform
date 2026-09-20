import { useMemo } from 'react';
import { Ticket, Users, Activity, MessageSquareQuote, Clock3, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Chip, Divider, LinearProgress, List, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import { adminApi } from '../../api/admin';

function MetricCard({ label, value, Icon }: { label: string; value: number; Icon: any }) {
  return (
    <Card sx={{ borderRadius: 4, height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box>
            <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: 2.5 }}>
              {label}
            </Typography>
            <Typography variant='h3' sx={{ mt: 1, fontWeight: 800 }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText', p: 1.5, display: 'grid', placeItems: 'center' }}>
            <Icon className='h-5 w-5' />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.getDashboard });
  const ticketStats = data?.ticketStatistics;

  const metrics = useMemo(
    () => [
      { label: 'Open tickets', value: ticketStats?.openTickets ?? 0, icon: Ticket },
      { label: 'Active sessions', value: data?.activeSessions ?? 0, icon: MessageSquareQuote },
      { label: 'Pending tasks', value: data?.pendingTasks ?? 0, icon: Activity },
      { label: 'Active users', value: data?.activeUsers ?? 0, icon: Users },
    ],
    [data, ticketStats]
  );

  const ticketTotal = ticketStats?.totalTickets || 0;
  const openRate = ticketTotal ? Math.round(((ticketStats?.openTickets ?? 0) / ticketTotal) * 100) : 0;
  const resolvedRate = ticketTotal ? Math.round(((ticketStats?.resolvedTickets ?? 0) / ticketTotal) * 100) : 0;

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card
        sx={{
          borderRadius: 5,
          overflow: 'hidden',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(232,97,26,0.18), rgba(18,18,21,0.95))'
              : 'linear-gradient(135deg, rgba(232,97,26,0.14), rgba(255,255,255,0.96))',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, alignItems: 'stretch' }}>
            <Box>
              <Chip label='Admin control room' color='primary' sx={{ mb: 2, fontWeight: 700 }} />
              <Typography variant='h3' sx={{ fontWeight: 900, lineHeight: 1.05, maxWidth: 620 }}>
                Operational overview for tasks, users, and audit activity.
              </Typography>
              <Typography variant='body1' color='text.secondary' sx={{ mt: 2, maxWidth: 640, lineHeight: 1.8 }}>
                Monitor support flows, prioritize work, and keep a clear view of the admin pipeline in one polished dashboard.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gap: 2 }}>
              <Card variant='outlined' sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant='overline' color='text.secondary'>Open ticket rate</Typography>
                      <Typography variant='h4' sx={{ fontWeight: 800 }}>{openRate}%</Typography>
                    </Box>
                    <ShieldAlert className='h-6 w-6 text-primary-500' />
                  </Box>
                  <LinearProgress variant='determinate' value={openRate} sx={{ mt: 2, height: 10, borderRadius: 999 }} />
                </CardContent>
              </Card>

              <Card variant='outlined' sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant='overline' color='text.secondary'>Resolved rate</Typography>
                      <Typography variant='h4' sx={{ fontWeight: 800 }}>{resolvedRate}%</Typography>
                    </Box>
                    <Clock3 className='h-6 w-6 text-primary-500' />
                  </Box>
                  <LinearProgress variant='determinate' value={resolvedRate} color='success' sx={{ mt: 2, height: 10, borderRadius: 999 }} />
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
        {metrics.map(({ label, value, icon: Icon }) => (
          <Box key={label}>
            <MetricCard label={label} value={value} Icon={Icon} />
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>Recent tasks</Typography>
              <Typography variant='caption' color='text.secondary'>Latest 5</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List disablePadding>
              {(data?.recentTasks || []).slice(0, 5).map(task => (
                <ListItem key={task.id} disableGutters sx={{ py: 1.2 }}>
                  <ListItemAvatar>
                    <Box sx={{ width: 40, height: 40, borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                      #{task.id}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={task.taskType || 'TASK'}
                    secondary={task.client?.name || task.ticket?.subject || 'N/A'}
                  />
                  <Chip label={task.status} size='small' variant='outlined' />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>Recent activity</Typography>
              <Typography variant='caption' color='text.secondary'>Latest 5</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List disablePadding>
              {(data?.recentAuditLogs || []).slice(0, 5).map(log => (
                <ListItem key={log.id} disableGutters sx={{ py: 1.2 }}>
                  <ListItemAvatar>
                    <Box sx={{ width: 40, height: 40, borderRadius: 3, bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
                      <Activity className='h-5 w-5 text-primary-500' />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={log.action}
                    secondary={`${log.userEmail || 'system'} · ${log.entity || 'N/A'}`}
                  />
                  <Chip label={log.status} size='small' variant='outlined' />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
