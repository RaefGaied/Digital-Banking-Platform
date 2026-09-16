import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowRightLeft, Bot, CheckCircle2, Clock3, Plus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Box, Button, Card, CardContent, Chip, IconButton, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { sessionsApi } from '../api/sessions';
import { agentsApi } from '../api/agents';
import type { CreateSessionRequest, SessionRecord } from '../types';
import { useAuth } from '../hooks/useAuth';

function formatDate(value: string | null | undefined) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, userRole } = useAuth();
  const canLoadSessions = isAuthenticated && userRole === 'USER';
  const [ipAddress, setIpAddress] = useState('');

  const sessionsQuery = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => sessionsApi.listMine(),
    enabled: canLoadSessions,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const activeSessionsQuery = useQuery({
    queryKey: ['my-active-sessions'],
    queryFn: () => sessionsApi.getActive(),
    enabled: canLoadSessions,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSessionRequest) => sessionsApi.create(payload),
    onSuccess: () => {
      setIpAddress('');
      void queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['my-active-sessions'] });
    },
  });

  const sessionActionMutation = useMutation({
    mutationFn: async ({ sessionId, action }: { sessionId: string; action: 'open' | 'close' | 'activity' }) => {
      if (action === 'open') return sessionsApi.open(sessionId);
      if (action === 'close') return sessionsApi.close(sessionId);
      return sessionsApi.recordActivity(sessionId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['my-active-sessions'] });
    },
  });

  const agentMutation = useMutation({
    mutationFn: (sessionId: string) => agentsApi.createForSession(sessionId),
    onSuccess: (agent) => {
      void queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      navigate(`/agents?selected=${agent.id}`);
    },
  });

  const summaryCards = useMemo(() => ([
    { label: 'Total sessions', value: sessionsQuery.data?.length ?? 0, icon: Activity },
    { label: 'Active sessions', value: activeSessionsQuery.data?.length ?? 0, icon: ShieldCheck },
    { label: 'Agent-linked', value: (sessionsQuery.data ?? []).filter((session) => Boolean(session.agentId)).length, icon: ArrowRightLeft },
  ]), [activeSessionsQuery.data?.length, sessionsQuery.data]);

  if (!canLoadSessions) {
    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>Banking Sessions</Typography>
        <Typography variant='body2' color='text.secondary'>Session tools are available for user sessions only.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 800 }}>
            Banking Sessions
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Create, open, close, and track your active banking sessions.
          </Typography>
        </Box>
        <IconButton onClick={() => void queryClient.invalidateQueries({ queryKey: ['my-sessions'] })} sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <RefreshCw className='h-4 w-4' />
        </IconButton>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} sx={{ borderRadius: 4 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant='body2' color='text.secondary'>{label}</Typography>
                <Typography variant='h5' sx={{ fontWeight: 800 }}>{value}</Typography>
              </Box>
              <Icon className='h-6 w-6 text-orange-500' />
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>Create a session</Typography>
              <Typography variant='body2' color='text.secondary'>
                A session represents a live banking context for the user and can be linked to a banking agent.
              </Typography>
            </Box>
            <Button
              variant='contained'
              startIcon={<Plus className='h-4 w-4' />}
              onClick={() => createMutation.mutate({ ipAddress: ipAddress.trim() || undefined })}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create session'}
            </Button>
          </Box>
          <TextField
            label='IP address (optional)'
            placeholder='127.0.0.1'
            value={ipAddress}
            onChange={(event) => setIpAddress(event.target.value)}
            fullWidth
          />
          <Typography variant='body2' color='text.secondary'>
            {createMutation.isError ? 'Failed to create session.' : 'You can create a session from here and manage it below.'}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>Your sessions</Typography>
              <Typography variant='body2' color='text.secondary'>
                Review your current sessions and the linked banking agent if one is assigned.
              </Typography>
            </Box>
            <Chip label={`${sessionsQuery.data?.length ?? 0} sessions`} variant='outlined' />
          </Box>

          <Stack spacing={2}>
            {sessionsQuery.isLoading && <Typography variant='body2' color='text.secondary'>Loading sessions...</Typography>}
            {(sessionsQuery.data ?? []).length === 0 && !sessionsQuery.isLoading && (
              <Typography variant='body2' color='text.secondary'>No sessions yet. Create one above.</Typography>
            )}

            {(sessionsQuery.data ?? []).map((session: SessionRecord) => {
              const isActive = session.status === 'ACTIVE' || session.status === 'OPENED';
              return (
                <Box key={session.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 2, bgcolor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='subtitle1' sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                        Session {session.id}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Status: {session.status} · IP: {session.ipAddress ?? 'N/A'}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Agent: {session.agentId ?? 'Not linked yet'}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Created: {formatDate(session.createdAt)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Last activity: {formatDate(session.lastActivityAt)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Closed: {formatDate(session.closedAt)}
                      </Typography>
                    </Box>

                    <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip
                        icon={isActive ? <CheckCircle2 className='h-4 w-4' /> : <XCircle className='h-4 w-4' />}
                        label={isActive ? 'Active' : 'Inactive'}
                        color={isActive ? 'success' : 'default'}
                        variant='outlined'
                      />
                      <Button size='small' variant='outlined' onClick={() => sessionActionMutation.mutate({ sessionId: session.id, action: 'open' })} disabled={sessionActionMutation.isPending}>
                        Open
                      </Button>
                      <Button size='small' variant='outlined' onClick={() => sessionActionMutation.mutate({ sessionId: session.id, action: 'activity' })} disabled={sessionActionMutation.isPending}>
                        Activity
                      </Button>
                      {session.agentId ? (
                        <Button size='small' variant='outlined' startIcon={<Bot className='h-4 w-4' />} onClick={() => navigate(`/agents?selected=${session.agentId}`)}>
                          Agent
                        </Button>
                      ) : (
                        <Button size='small' variant='outlined' startIcon={<Bot className='h-4 w-4' />} onClick={() => agentMutation.mutate(session.id)} disabled={agentMutation.isPending}>
                          Link agent
                        </Button>
                      )}
                      <Button size='small' variant='outlined' onClick={() => navigate(`/sessions/${session.id}/chat`)}>
                        Chat
                      </Button>
                      <Button size='small' variant='contained' color='error' onClick={() => sessionActionMutation.mutate({ sessionId: session.id, action: 'close' })} disabled={sessionActionMutation.isPending}>
                        Close
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>Active sessions</Typography>
              <Typography variant='body2' color='text.secondary'>
                Quick view of currently active banking sessions.
              </Typography>
            </Box>
            <Clock3 className='h-5 w-5 text-orange-500' />
          </Box>
          <Stack spacing={1.5}>
            {(activeSessionsQuery.data ?? []).map((session) => (
              <Box key={session.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>#{session.id}</Typography>
                <Typography variant='body2' color='text.secondary'>{session.agentId ?? 'No agent'}</Typography>
              </Box>
            ))}
            {(activeSessionsQuery.data ?? []).length === 0 && (
              <Typography variant='body2' color='text.secondary'>No active sessions right now.</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
