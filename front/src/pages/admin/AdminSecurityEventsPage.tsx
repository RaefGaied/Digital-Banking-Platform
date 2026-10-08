import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, Fingerprint, ShieldAlert } from 'lucide-react';
import { Alert, Box, Button, Card, CardContent, Chip, TablePagination, TextField, Typography } from '@mui/material';
import { adminApi } from '../../api/admin';
import type { AdminSecurityEventAnalysis, AdminSecurityEventResolutionRequest } from '../../types';

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
  const [resolutionForms, setResolutionForms] = useState<Record<string, AdminSecurityEventResolutionRequest>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [analyses, setAnalyses] = useState<Record<string, AdminSecurityEventAnalysis>>({});
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: (eventId: string) => adminApi.analyzeSecurityEvent(eventId),
    onSuccess: (analysis, eventId) => setAnalyses((prev) => ({ ...prev, [eventId]: analysis })),
  });

  const applyAnalysis = (eventId: string) => {
    const a = analyses[eventId];
    if (!a) return;
    setResolutionForms((prev) => ({
      ...prev,
      [eventId]: {
        incidentSummary: a.incidentSummary,
        investigationFindings: a.investigationFindings,
        correctiveActions: a.correctiveActions,
        preventiveMeasures: a.preventiveMeasures,
      },
    }));
  };

  const createEmptyForm = (): AdminSecurityEventResolutionRequest => ({
    incidentSummary: '',
    investigationFindings: '',
    correctiveActions: '',
    preventiveMeasures: '',
  });

  const eventsQuery = useQuery({
    queryKey: ['admin-security-events', page, rowsPerPage],
    queryFn: () => adminApi.getSecurityEvents(page, rowsPerPage),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: AdminSecurityEventResolutionRequest }) =>
      adminApi.resolveSecurityEvent(eventId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-security-events'] }),
  });

  const typeBg = (type: string) => {
    switch (type) {
      case 'REUSE_DETECTED': return 'rgba(239, 68, 68, 0.14)';
      case 'BRUTE_FORCE': return 'rgba(245, 158, 11, 0.14)';
      case 'ACCOUNT_LOCKED': return 'rgba(59, 130, 246, 0.14)';
      default: return 'rgba(234, 179, 8, 0.14)';
    }
  };

  const openInvestigation = (eventId: string) => {
    setExpandedEventId(eventId);
    setResolutionForms((prev) => ({
      ...prev,
      [eventId]: prev[eventId] ?? createEmptyForm(),
    }));
    setFormErrors((prev) => ({ ...prev, [eventId]: '' }));
  };

  const updateField = (eventId: string, field: keyof AdminSecurityEventResolutionRequest, value: string) => {
    setResolutionForms((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] ?? createEmptyForm()),
        [field]: value,
      },
    }));
  };

  const resolveEvent = (eventId: string) => {
    const form = resolutionForms[eventId] ?? createEmptyForm();
    const payload: AdminSecurityEventResolutionRequest = {
      incidentSummary: form.incidentSummary.trim(),
      investigationFindings: form.investigationFindings.trim(),
      correctiveActions: form.correctiveActions.trim(),
      preventiveMeasures: form.preventiveMeasures?.trim() || undefined,
    };

    if (!payload.incidentSummary || !payload.investigationFindings || !payload.correctiveActions) {
      setFormErrors((prev) => ({
        ...prev,
        [eventId]: 'Incident summary, investigation findings, and corrective actions are required.',
      }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, [eventId]: '' }));
    resolveMutation.mutate(
      { eventId, payload },
      {
        onSuccess: () => {
          setExpandedEventId(null);
          setResolutionForms((prev) => {
            const next = { ...prev };
            delete next[eventId];
            return next;
          });
        },
      },
    );
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
          const form = resolutionForms[event.id] ?? createEmptyForm();
          const eventError = formErrors[event.id];
          const isResolvingThisEvent = resolveMutation.isPending && resolveMutation.variables?.eventId === event.id;

          return (
            <Card key={event.id} sx={{ borderRadius: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 999, bgcolor: typeBg(event.type), display: 'grid', placeItems: 'center', flexShrink: 0 }}>
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

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
                        onClick={() => openInvestigation(event.id)}
                        disabled={resolveMutation.isPending}
                      >
                        Investigate & Resolve
                      </Button>
                    )}
                  </Box>
                </Box>

                {isExpanded && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider', display: 'grid', gap: 1.25 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Event ID: {event.id}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      State: {event.resolved ? 'Resolved' : 'Open'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Complete the investigation details before resolving this security event.
                    </Typography>
                    {!event.resolved && (
                      <>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            variant='outlined'
                            size='small'
                            onClick={() => analyzeMutation.mutate(event.id)}
                            disabled={analyzeMutation.isPending && analyzeMutation.variables === event.id}
                          >
                            {analyzeMutation.isPending && analyzeMutation.variables === event.id
                              ? 'Analyzing…'
                              : 'Get AI analysis & suggested solution'}
                          </Button>
                          {analyses[event.id] && (
                            <Button variant='contained' size='small' onClick={() => applyAnalysis(event.id)}>
                              Use suggestion in form
                            </Button>
                          )}
                        </Box>
                        {analyzeMutation.isError && analyzeMutation.variables === event.id && (
                          <Alert severity='error'>AI analysis failed. You can still investigate manually.</Alert>
                        )}
                        {analyses[event.id] && (
                          <Alert severity='info' sx={{ whiteSpace: 'pre-line' }}>
                            <strong>How it happens:</strong> {analyses[event.id].explanation}
                            {analyses[event.id].aiAssessment && (
                              <>
                                {'\n\n'}
                                <strong>AI assessment (review before use):</strong>
                                {'\n'}
                                {analyses[event.id].aiAssessment}
                              </>
                            )}
                            {'\n\n'}
                            <strong>Suggested solution:</strong>
                            {'\n'}
                            {analyses[event.id].correctiveActions}
                          </Alert>
                        )}
                        <TextField
                          label='Incident summary'
                          value={form.incidentSummary}
                          onChange={(e) => updateField(event.id, 'incidentSummary', e.target.value)}
                          size='small'
                          fullWidth
                          required
                        />
                        <TextField
                          label='Investigation findings'
                          value={form.investigationFindings}
                          onChange={(e) => updateField(event.id, 'investigationFindings', e.target.value)}
                          size='small'
                          fullWidth
                          multiline
                          minRows={3}
                          required
                        />
                        <TextField
                          label='Corrective actions'
                          value={form.correctiveActions}
                          onChange={(e) => updateField(event.id, 'correctiveActions', e.target.value)}
                          size='small'
                          fullWidth
                          multiline
                          minRows={2}
                          required
                        />
                        <TextField
                          label='Preventive measures (optional)'
                          value={form.preventiveMeasures ?? ''}
                          onChange={(e) => updateField(event.id, 'preventiveMeasures', e.target.value)}
                          size='small'
                          fullWidth
                          multiline
                          minRows={2}
                        />
                        {eventError && <Alert severity='warning'>{eventError}</Alert>}
                        {resolveMutation.isError && isResolvingThisEvent && (
                          <Alert severity='error'>Failed to resolve event. Please try again.</Alert>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button
                            variant='text'
                            onClick={() => setExpandedEventId(null)}
                            disabled={isResolvingThisEvent}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant='contained'
                            onClick={() => resolveEvent(event.id)}
                            disabled={isResolvingThisEvent}
                          >
                            {isResolvingThisEvent ? 'Resolving...' : 'Confirm resolution'}
                          </Button>
                        </Box>
                      </>
                    )}
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