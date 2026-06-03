import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, Fingerprint, ShieldAlert } from 'lucide-react';
import { Box, Button, Card, CardContent, Chip, TablePagination, Typography } from '@mui/material';
import { adminApi } from '../../api/admin';

const typeConfig: Record<string, { label: string; color: 'warning' | 'error' | 'info' | 'success'; icon: typeof ShieldAlert }> = {
  REUSE_DETECTED: { label: 'Token reuse', color: 'error', icon: ShieldAlert },
  BRUTE_FORCE: { label: 'Brute force', color: 'warning', icon: AlertCircle },
  ACCOUNT_LOCKED: { label: 'Account locked', color: 'info', icon: Clock3 },
  SUSPICIOUS_ACTIVITY: { label: 'Suspicious activity', color: 'warning', icon: Fingerprint },
};

export default function AdminSecurityEventsPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['admin-security-events', page, rowsPerPage],
    queryFn: () => adminApi.getSecurityEvents(page, rowsPerPage),
  });

  const resolveMutation = useMutation({
    mutationFn: adminApi.resolveSecurityEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-security-events'] }),
  });

  const typeBg = (type: string) => {
    switch (type) {
      case 'REUSE_DETECTED': return '#fff1f2';
      case 'BRUTE_FORCE': return '#fff7ed';
      case 'ACCOUNT_LOCKED': return '#eff6ff';
      default: return '#fefce8';
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          Security events
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Monitor token reuse, brute-force attempts, and other detected security incidents.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2 }}>
        {eventsQuery.data?.content.map((event) => {
          const cfg = typeConfig[event.type] || typeConfig.SUSPICIOUS_ACTIVITY;
          const Icon = cfg.icon;
          const isExpanded = expandedEventId === event.id;

          return (
            <Card key={event.id} sx={{ borderRadius: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 999, bgcolor: typeBg(event.type), display: 'grid', placeItems: 'center' }}>
                      <Icon className='h-5 w-5' />
                    </Box>
                    <Box>
                      <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                        {cfg.label}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        User {event.userId}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {event.timestamp} · {event.ipAddress || 'unknown IP'} · {event.deviceId || 'unknown device'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={event.resolved ? 'Resolved' : 'Open'}
                      color={event.resolved ? 'success' : 'warning'}
                      size='small'
                      onClick={() => setExpandedEventId(prev => prev === event.id ? null : event.id)}
                      sx={{ cursor: 'pointer' }}
                    />
                    {!event.resolved && (
                      <Button
                        variant='outlined'
                        size='small'
                        onClick={() => resolveMutation.mutate(event.id)}
                        disabled={resolveMutation.isPending}
                      >
                        Resolve
                      </Button>
                    )}
                  </Box>
                </Box>

                {isExpanded && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider', display: 'grid', gap: 0.75 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Event ID: {event.id}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      State: {event.resolved ? 'Resolved' : 'Open'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      This record is created by the backend when a security action happens. Click Resolve to mark it reviewed.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}

        {!eventsQuery.data?.content.length && (
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircle2 className='h-5 w-5 text-green-500' />
                <Typography variant='body2' color='text.secondary'>
                  No security events found.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ py: 0 }}>
          <TablePagination
            component='div'
            count={eventsQuery.data?.totalElements ?? 0}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </CardContent>
      </Card>
    </Box>
  );
}