import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Check,
  RefreshCw,
  X,
  Eye,
  GitBranch,
  Clock3,
  Database,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  ArrowUpRight,
  RotateCcw,
  Download,
  Activity,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { AdminTicketSummary, FlowableProcessSummary } from '../../types';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

function getProcessStatus(process?: FlowableProcessSummary) {
  if (!process) return 'Terminé';
  if (process.active) return 'En cours';
  if (process.deleteReason) return 'Annulé';
  if (/approv/i.test(process.endActivityId || '')) return 'Approuvé';
  if (/reject/i.test(process.endActivityId || '')) return 'Rejeté';
  return process.endActivityId || 'Terminé';
}

export default function AdminTasksPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inbox' | 'workflows' | 'tickets'>('inbox');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedProcessInstanceId, setSelectedProcessInstanceId] = useState<string | null>(null);
  const [selectedTraceActivityId, setSelectedTraceActivityId] = useState<string | null>(null);
  const [processPage, setProcessPage] = useState(0);
  const [ticketPage, setTicketPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketSummary | null>(null);
  const [ticketDownloadError, setTicketDownloadError] = useState<string | null>(null);
  const [ticketComment, setTicketComment] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [ticketActionError, setTicketActionError] = useState<string | null>(null);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [submittedDecision, setSubmittedDecision] = useState<
    'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE' | 'CONTINUE'
      | 'BLOQUER' | 'CONTACTER' | 'FAUX_POSITIF' | null
  >(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const tasksQuery = useQuery({
    queryKey: ['admin-tasks', page, rowsPerPage],
    queryFn: () => adminApi.getTasks(page, rowsPerPage),
  });
  const flowableTasksQuery = useQuery({
    queryKey: ['admin-flowable-tasks'],
    queryFn: adminApi.getFlowableTasks,
  });
  const flowableProcessesQuery = useQuery({
    queryKey: ['admin-flowable-processes', processPage],
    queryFn: () => adminApi.getFlowableProcesses(processPage),
  });
  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets', ticketPage],
    queryFn: () => adminApi.getTickets(ticketPage),
  });
  const selectedTaskQuery = useQuery({
    queryKey: ['admin-task', selectedTaskId],
    queryFn: () => adminApi.getTask(selectedTaskId as string),
    enabled: selectedTaskId !== null,
  });
  const flowableDetailQuery = useQuery({
    queryKey: ['admin-flowable-process', selectedProcessInstanceId],
    queryFn: () => adminApi.getFlowableProcessDetails(selectedProcessInstanceId as string),
    enabled: selectedProcessInstanceId !== null,
  });
  const processTraceQuery = useQuery({
    queryKey: ['admin-flowable-trace', selectedProcessInstanceId],
    queryFn: () => adminApi.getFlowableProcessTrace(selectedProcessInstanceId as string),
    enabled: selectedProcessInstanceId !== null,
    refetchInterval: () => {
      const selectedProcess = flowableProcessesQuery.data?.content.find((process) => process.id === selectedProcessInstanceId);
      return selectedProcess?.active ? 3000 : false;
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-flowable-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-flowable-processes'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-flowable-process', selectedProcessInstanceId] });
    void queryClient.invalidateQueries({ queryKey: ['admin-flowable-trace', selectedProcessInstanceId] });
  };

  const downloadIdentityDocument = async () => {
    const variables = flowableDetailQuery.data?.variables;
    const ticketId = Number(variables?.supportTicketId);
    if (!Number.isSafeInteger(ticketId) || ticketId <= 0) return;
    try {
      const file = await adminApi.downloadTicketAttachment(ticketId);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = typeof variables?.identityDocumentName === 'string'
        ? variables.identityDocumentName
        : `ticket-${ticketId}-identity-document`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setCompletionError('La pièce d’identité n’a pas pu être téléchargée.');
    }
  };

  const downloadTicketAttachment = async (ticket: AdminTicketSummary) => {
    setTicketDownloadError(null);
    try {
      const file = await adminApi.downloadTicketAttachment(ticket.id);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = ticket.attachmentName || `ticket-${ticket.id}-attachment`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setTicketDownloadError(`La pièce jointe du ticket #${ticket.id} n’a pas pu être téléchargée.`);
    }
  };

  const actMutation = useMutation({
    mutationFn: ({ taskId, action }: { taskId: string; action: 'APPROVE' | 'REJECT' }) =>
      adminApi.actOnTask(taskId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-task', selectedTaskId] });
      setSelectedTaskId(null);
    },
  });

  const flowableMutation = useMutation({
    mutationFn: ({
      taskId,
      decision,
    }: {
      taskId: string;
      decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE' | 'CONTINUE'
        | 'BLOQUER' | 'CONTACTER' | 'FAUX_POSITIF';
    }) => adminApi.completeFlowableTask(taskId, decision),
    onMutate: ({ decision }) => {
      setSubmittedDecision(decision);
      setCompletionError(null);
    },
    onSuccess: () => {
      refresh();
    },
    onError: (error) => {
      setSubmittedDecision(null);
      setCompletionError(error instanceof Error ? error.message : 'Flowable n’a pas pu compléter cette tâche.');
    },
  });

  const ticketActionMutation = useMutation({
    mutationFn: (request: { ticketId: number; action: 'TAKE_OWNERSHIP' | 'REQUEST_INFO' | 'SEND_UPDATE' | 'RESOLVE'; comment?: string }) =>
      adminApi.actOnGeneralTicket(request.ticketId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setSelectedTicket(null);
      setTicketComment('');
      setTicketActionError(null);
    },
    onError: (error) => {
      setTicketActionError(error instanceof Error ? error.message : 'Le ticket n’a pas pu être mis à jour.');
    },
  });

  const aiDraftMutation = useMutation({
    mutationFn: ({ ticketId, question }: { ticketId: number; question: string }) =>
      adminApi.draftGeneralTicketReply(ticketId, question),
    onSuccess: ({ draft }) => {
      setTicketComment(draft);
      setAiDraftError(null);
    },
    onError: (error) => {
      setAiDraftError(error instanceof Error ? error.message : 'La proposition n’a pas pu être générée.');
    },
  });

  const hasSyntheticTrace = processTraceQuery.data?.some((event) => event.synthetic) ?? false;
  const selectedProcess = flowableProcessesQuery.data?.content.find((process) => process.id === selectedProcessInstanceId);
  const selectedActiveTask = (flowableTasksQuery.data ?? []).find((task) => task.processInstanceId === selectedProcessInstanceId);
  const selectedFlowableTaskIsActive = Boolean(selectedActiveTask);
  const traceEvents = processTraceQuery.data ?? [];
  const activeTraceActivityId = selectedTraceActivityId ?? traceEvents[0]?.activityId ?? null;
  const completedTraceEvents = traceEvents.filter((event) => event.completed);
  const workflowProgress = hasSyntheticTrace ? 0 : (
    processTraceQuery.data?.length
      ? Math.round((completedTraceEvents.length / traceEvents.length) * 100)
      : 0
  );

  const inboxCount = tasksQuery.data?.totalElements ?? 0;
  const workflowsCount = flowableProcessesQuery.data?.totalElements ?? 0;
  const activeProcessesCount = (flowableProcessesQuery.data?.content ?? []).filter((process) => process.active).length;
  const ticketsCount = ticketsQuery.data?.totalElements ?? 0;
  const openTicketsCount = (ticketsQuery.data?.content ?? []).filter((ticket) => ticket.status === 'OPEN').length;

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
            Opérations & Workflows
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Supervision ciblée des validations en attente, des processus BPMN Flowable et des tickets support.
          </Typography>
        </Box>
        <IconButton onClick={refresh} sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <RefreshCw className='h-4 w-4' />
        </IconButton>
      </Box>

      {/* KPI Overview Cards (Clickable to switch tab) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        <Card
          onClick={() => setActiveTab('inbox')}
          sx={{
            p: 2.2,
            borderRadius: 3.5,
            cursor: 'pointer',
            border: 2,
            borderColor: activeTab === 'inbox' ? 'primary.main' : 'divider',
            bgcolor: activeTab === 'inbox' ? 'action.selected' : 'background.paper',
            transition: 'all 0.2s ease',
            '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: activeTab === 'inbox' ? 'primary.main' : 'action.hover',
                color: activeTab === 'inbox' ? '#fff' : 'primary.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Activity size={18} />
            </Box>
            <Chip
              label={inboxCount > 0 ? `${inboxCount} en attente` : 'À jour'}
              size='small'
              color={inboxCount > 0 ? 'warning' : 'default'}
              sx={{ fontWeight: 800, fontSize: 10.5 }}
            />
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 900 }}>
            {inboxCount}
          </Typography>
          <Typography variant='subtitle2' sx={{ fontWeight: 800, color: 'text.primary', mt: 0.2 }}>
            Tâches en Attente
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            Validations manuelles et contrôle de conformité
          </Typography>
        </Card>

        <Card
          onClick={() => setActiveTab('workflows')}
          sx={{
            p: 2.2,
            borderRadius: 3.5,
            cursor: 'pointer',
            border: 2,
            borderColor: activeTab === 'workflows' ? 'primary.main' : 'divider',
            bgcolor: activeTab === 'workflows' ? 'action.selected' : 'background.paper',
            transition: 'all 0.2s ease',
            '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: activeTab === 'workflows' ? 'primary.main' : 'action.hover',
                color: activeTab === 'workflows' ? '#fff' : 'primary.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <GitBranch size={18} />
            </Box>
            <Chip
              label={`${activeProcessesCount} actifs`}
              size='small'
              color={activeProcessesCount > 0 ? 'primary' : 'default'}
              sx={{ fontWeight: 800, fontSize: 10.5 }}
            />
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 900 }}>
            {workflowsCount}
          </Typography>
          <Typography variant='subtitle2' sx={{ fontWeight: 800, color: 'text.primary', mt: 0.2 }}>
            Workflows BPMN
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            Instances Flowable actives et traçabilité d'audit
          </Typography>
        </Card>

        <Card
          onClick={() => setActiveTab('tickets')}
          sx={{
            p: 2.2,
            borderRadius: 3.5,
            cursor: 'pointer',
            border: 2,
            borderColor: activeTab === 'tickets' ? 'primary.main' : 'divider',
            bgcolor: activeTab === 'tickets' ? 'action.selected' : 'background.paper',
            transition: 'all 0.2s ease',
            '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: activeTab === 'tickets' ? 'primary.main' : 'action.hover',
                color: activeTab === 'tickets' ? '#fff' : 'primary.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <MessageSquare size={18} />
            </Box>
            <Chip
              label={`${openTicketsCount} ouverts`}
              size='small'
              color={openTicketsCount > 0 ? 'info' : 'default'}
              sx={{ fontWeight: 800, fontSize: 10.5 }}
            />
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 900 }}>
            {ticketsCount}
          </Typography>
          <Typography variant='subtitle2' sx={{ fontWeight: 800, color: 'text.primary', mt: 0.2 }}>
            Tickets de Support
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            Réclamations et réponses assistées
          </Typography>
        </Card>
      </Box>

      {/* Segmented Filter Buttons */}
      <Box sx={{ display: 'flex', gap: 1, borderBottom: 1, borderColor: 'divider', pb: 1.5, overflowX: 'auto' }}>
        {[
          { key: 'inbox', label: 'Tâches en Attente', count: inboxCount, icon: Activity },
          { key: 'workflows', label: 'Workflows BPMN', count: workflowsCount, icon: GitBranch },
          { key: 'tickets', label: 'Tickets Support', count: ticketsCount, icon: MessageSquare },
        ].map(({ key, label, count, icon: Icon }) => {
          const isSelected = activeTab === key;
          return (
            <Button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              variant={isSelected ? 'contained' : 'outlined'}
              startIcon={<Icon size={16} />}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 800,
                px: 2.2,
                py: 0.9,
                fontSize: 13,
                boxShadow: isSelected ? '0 4px 12px -2px rgba(232,97,26,0.3)' : 'none',
              }}
            >
              <span>{label}</span>
              <Chip
                label={count}
                size='small'
                sx={{
                  ml: 1,
                  height: 20,
                  fontSize: 11,
                  fontWeight: 900,
                  bgcolor: isSelected ? 'rgba(255,255,255,0.25)' : 'action.hover',
                  color: isSelected ? '#ffffff' : 'text.primary',
                }}
              />
            </Button>
          );
        })}
      </Box>

      {/* ── TAB 1: INBOX TASKS ── */}
      {activeTab === 'inbox' && (
        <Stack spacing={2.5}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 0, overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Tâche</TableCell>
                    <TableCell>Client / Sujet</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align='right'>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasksQuery.data?.content.map((task) => (
                    <TableRow
                      key={task.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 700 }}>#{task.id}</Typography>
                        <Typography variant='caption' color='text.secondary'>{task.processInstanceId}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{task.client?.name || task.ticket?.subject || 'N/A'}</Typography>
                        <Typography variant='caption' color='text.secondary'>{task.client?.email || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={task.taskType || 'TASK'} size='small' color='primary' variant='outlined' />
                      </TableCell>
                      <TableCell>
                        <Chip label={task.status} size='small' color='default' variant='outlined' />
                      </TableCell>
                      <TableCell align='right'>
                        <Button
                          size='small'
                          variant='outlined'
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(task.id);
                          }}
                        >
                          Examiner
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tasksQuery.data?.content.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align='center'>
                        <Typography variant='body2' color='text.secondary' sx={{ py: 4 }}>
                          Aucune tâche en attente dans la file administrative.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component='div'
                count={tasksQuery.data?.totalElements ?? 0}
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

          {/* Task detail card rendered right below Table 1 */}
          {selectedTaskId && selectedTaskQuery.data?.task && (
            <Card sx={{ borderRadius: 4, border: 1, borderColor: 'primary.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant='h6' sx={{ fontWeight: 800 }}>
                    Détails de la tâche #{selectedTaskId}
                  </Typography>
                  <Button size='small' onClick={() => setSelectedTaskId(null)}>Fermer</Button>
                </Box>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  {selectedTaskQuery.data.task.description || selectedTaskQuery.data.task.ticket?.description}
                </Typography>
                {selectedTaskQuery.data.task.ticket?.ticketType === 'GENERAL' ? (
                  <Alert severity='info' sx={{ mt: 2 }}>
                    Les tickets généraux ne sont pas des approbations directes. Rendez-vous dans l'onglet Tickets Support pour y répondre.
                  </Alert>
                ) : (
                  <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
                    <Button
                      variant='contained'
                      color='success'
                      onClick={() => actMutation.mutate({ taskId: selectedTaskId, action: 'APPROVE' })}
                      disabled={actMutation.isPending}
                    >
                      Approuver
                    </Button>
                    <Button
                      variant='outlined'
                      color='error'
                      onClick={() => actMutation.mutate({ taskId: selectedTaskId, action: 'REJECT' })}
                      disabled={actMutation.isPending}
                    >
                      Rejeter
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* ── TAB 2: BPMN WORKFLOWS ── */}
      {activeTab === 'workflows' && (
        <Stack spacing={2.5}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant='h6' sx={{ fontWeight: 800 }}>
                    Historique des Workflows BPMN
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Instances actives et terminées avec traçabilité d'exécution.
                  </Typography>
                </Box>
                <Chip label={`${flowableProcessesQuery.data?.totalElements ?? 0} au total`} color='primary' variant='outlined' />
              </Box>
              {flowableProcessesQuery.isError && (
                <Alert severity='error' sx={{ mb: 2 }}>L'historique des workflows n'a pas pu être chargé. Actualisez pour réessayer.</Alert>
              )}
              <Box sx={{ overflowX: 'auto' }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Processus</TableCell>
                      <TableCell>Définition BPMN</TableCell>
                      <TableCell>Démarré le</TableCell>
                      <TableCell>Terminé le</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(flowableProcessesQuery.data?.content ?? []).map((process) => {
                      const activeTask = (flowableTasksQuery.data ?? []).find((task) => task.processInstanceId === process.id);
                      const isDataUpdateProcess = process.processDefinitionKey === 'dataUpdateValidationProcess';
                      const isFraudProcess = process.processDefinitionKey === 'fraudValidationProcess';
                      const isFollowupTask = activeTask?.taskDefinitionKey === 'followupTask';
                      const isEscalatedReview = activeTask?.taskDefinitionKey === 'escalatedReviewTask';
                      const isSelected = selectedProcessInstanceId === process.id;
                      return (
                        <TableRow
                          key={process.id}
                          hover
                          selected={isSelected}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedProcessInstanceId(process.id);
                            setSelectedTraceActivityId(null);
                            setSubmittedDecision(null);
                            setCompletionError(null);
                          }}
                        >
                          <TableCell>
                            <Typography variant='body2' sx={{ fontWeight: 700 }}>#{process.id}</Typography>
                            {process.businessKey && <Typography variant='caption' color='text.secondary'>{process.businessKey}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{process.processDefinitionName || process.processDefinitionKey || process.processDefinitionId}</Typography>
                            {process.activeTaskName && <Typography variant='caption' color='text.secondary'>{process.activeTaskName}</Typography>}
                          </TableCell>
                          <TableCell>{process.startedAt ? new Date(process.startedAt).toLocaleString() : '—'}</TableCell>
                          <TableCell>{process.endedAt ? new Date(process.endedAt).toLocaleString() : '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={getProcessStatus(process)}
                              color={process.active ? 'warning' : process.deleteReason ? 'default' : 'success'}
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <Button
                                size='small'
                                variant={isSelected ? 'contained' : 'outlined'}
                                startIcon={<Eye size={15} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProcessInstanceId(process.id);
                                  setSelectedTraceActivityId(null);
                                  setSubmittedDecision(null);
                                  setCompletionError(null);
                                }}
                              >
                                Trace
                              </Button>
                              {activeTask && isFollowupTask && (
                                <Button
                                  size='small'
                                  variant='contained'
                                  startIcon={<RotateCcw size={16} />}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    flowableMutation.mutate({ taskId: activeTask.id, decision: 'CONTINUE' });
                                  }}
                                  disabled={flowableMutation.isPending}
                                >
                                  Reprendre
                                </Button>
                              )}
                              {activeTask && isFraudProcess && activeTask.taskDefinitionKey === 'Task_AnalyseFraude' && (
                                <>
                                  <Button
                                    size='small'
                                    variant='contained'
                                    color='error'
                                    startIcon={<ShieldCheck size={16} />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      flowableMutation.mutate({ taskId: activeTask.id, decision: 'BLOQUER' });
                                    }}
                                    disabled={flowableMutation.isPending}
                                  >
                                    Bloquer la carte
                                  </Button>
                                  <Button
                                    size='small'
                                    variant='outlined'
                                    startIcon={<MessageSquare size={16} />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      flowableMutation.mutate({ taskId: activeTask.id, decision: 'CONTACTER' });
                                    }}
                                    disabled={flowableMutation.isPending}
                                  >
                                    Demander des justificatifs
                                  </Button>
                                  <Button
                                    size='small'
                                    variant='outlined'
                                    color='success'
                                    startIcon={<Check size={16} />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      flowableMutation.mutate({ taskId: activeTask.id, decision: 'FAUX_POSITIF' });
                                    }}
                                    disabled={flowableMutation.isPending}
                                  >
                                    Classer comme faux positif
                                  </Button>
                                </>
                              )}
                              {activeTask && !isFollowupTask && !isFraudProcess && (
                                <>
                                  <Button
                                    size='small'
                                    variant='contained'
                                    color='success'
                                    startIcon={<Check size={16} />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      flowableMutation.mutate({ taskId: activeTask.id, decision: 'APPROVE' });
                                    }}
                                    disabled={flowableMutation.isPending}
                                  >
                                    Approuver
                                  </Button>
                                  <Button
                                    size='small'
                                    variant='outlined'
                                    color='error'
                                    startIcon={<X size={16} />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      flowableMutation.mutate({ taskId: activeTask.id, decision: 'REJECT' });
                                    }}
                                    disabled={flowableMutation.isPending}
                                  >
                                    Rejeter
                                  </Button>
                                  {isDataUpdateProcess && (
                                    <Button
                                      size='small'
                                      variant='outlined'
                                      startIcon={<MessageSquare size={16} />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        flowableMutation.mutate({ taskId: activeTask.id, decision: 'REQUEST_INFO' });
                                      }}
                                      disabled={flowableMutation.isPending}
                                    >
                                      Demander infos
                                    </Button>
                                  )}
                                  {isDataUpdateProcess && !isEscalatedReview && (
                                    <Button
                                      size='small'
                                      variant='outlined'
                                      startIcon={<ArrowUpRight size={16} />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        flowableMutation.mutate({ taskId: activeTask.id, decision: 'ESCALATE' });
                                      }}
                                      disabled={flowableMutation.isPending}
                                    >
                                      Escalader
                                    </Button>
                                  )}
                                </>
                              )}
                              {activeTask && isFraudProcess && activeTask.taskDefinitionKey !== 'Task_AnalyseFraude' && (
                                <Typography variant='caption' color='text.secondary'>
                                  Aucune décision administrateur n’est définie pour cette étape de fraude.
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {flowableProcessesQuery.data?.content.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align='center'>
                          <Typography variant='body2' color='text.secondary' sx={{ py: 4 }}>
                            Aucun historique de processus Flowable disponible.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
              <TablePagination
                component='div'
                count={flowableProcessesQuery.data?.totalElements ?? 0}
                page={processPage}
                onPageChange={(_, nextPage) => setProcessPage(nextPage)}
                rowsPerPage={20}
                rowsPerPageOptions={[20]}
              />
            </CardContent>
          </Card>

          {/* Workflow execution trace panel directly under Table 2 */}
          {selectedProcessInstanceId && (
            <Card sx={{ borderRadius: 4, border: 1, borderColor: 'warning.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant='h6' sx={{ fontWeight: 800 }}>
                      <GitBranch size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                      Exécution du workflow #{selectedProcessInstanceId}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {selectedFlowableTaskIsActive
                        ? 'Supervision en temps réel du chemin BPMN, variables et preuves décisionnelles.'
                        : 'Supervision historique du chemin BPMN, variables et preuves décisionnelles.'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size='small'
                      label={getProcessStatus(selectedProcess)}
                      color={selectedProcess?.active ? 'warning' : selectedProcess?.deleteReason ? 'default' : 'success'}
                      variant='outlined'
                    />
                    <Button size='small' onClick={() => setSelectedProcessInstanceId(null)}>Fermer</Button>
                  </Box>
                </Box>
                {flowableDetailQuery.isLoading && (
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Chargement des variables du workflow…
                  </Typography>
                )}
                {flowableDetailQuery.isError && (
                  <Alert severity='error' sx={{ mb: 2 }}>
                    Les variables du workflow n'ont pas pu être chargées. Actualisez pour réessayer.
                  </Alert>
                )}
                {flowableMutation.isPending && (
                  <Alert severity='info' sx={{ mb: 2 }}>
                    Envoi de la décision {submittedDecision} à Flowable…
                  </Alert>
                )}
                {submittedDecision && !flowableMutation.isPending && !completionError && (
                  <Alert severity='success' sx={{ mb: 2 }}>
                    Décision <strong>{submittedDecision}</strong> enregistrée avec succès.
                  </Alert>
                )}
                {completionError && (
                  <Alert severity='error' sx={{ mb: 2 }}>
                    {completionError}
                  </Alert>
                )}
                {selectedProcess && !selectedProcess.active && (
                  <Alert severity={/approv|success|complete/i.test(selectedProcess.endActivityId || '') ? 'success' : 'info'} sx={{ mb: 2 }}>
                    <strong>Résultat final :</strong>{' '}
                    {getProcessStatus(selectedProcess)}
                    {selectedProcess.deleteReason ? `: ${selectedProcess.deleteReason}` : ''}
                    {selectedProcess.endedAt ? ` · ${new Date(selectedProcess.endedAt).toLocaleString()}` : ''}
                  </Alert>
                )}

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant='body2' sx={{ fontWeight: 800 }}>Progression de la chaîne BPMN</Typography>
                    <Typography variant='body2' color={workflowProgress === 100 ? 'success.main' : 'text.secondary'} sx={{ fontWeight: 800 }}>
                      {workflowProgress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={workflowProgress}
                    color={workflowProgress === 100 ? 'success' : 'warning'}
                    sx={{ height: 9, borderRadius: 5 }}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 1.5, mb: 3 }}>
                  {[
                    ['Activités enregistrées', traceEvents.length, <Clock3 size={16} />],
                    ['Activités terminées', completedTraceEvents.length, <ShieldCheck size={16} />],
                    ['Tâches manuelles', traceEvents.filter((event) => event.activityType === 'userTask').length, <Eye size={16} />],
                    ['État du workflow', getProcessStatus(selectedProcess), <Check size={16} />],
                  ].map(([label, value, icon]) => (
                    <Box key={String(label)} sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {icon}
                        <Typography variant='body2' sx={{ fontWeight: 700 }}>{label}</Typography>
                      </Box>
                      <Typography variant='caption' color='text.secondary'>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Typography variant='subtitle2' sx={{ fontWeight: 800, mb: 1 }}>
                  {hasSyntheticTrace ? 'Étapes du modèle BPMN' : 'Sélectionnez une étape pour examiner les détails d\'exécution :'}
                </Typography>
                {processTraceQuery.isLoading && (
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Chargement de la trace Flowable…
                  </Typography>
                )}
                {processTraceQuery.isError && (
                  <Typography variant='body2' color='error.main' sx={{ mb: 2 }}>
                    La trace Flowable n'a pas pu être chargée.
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {(processTraceQuery.data ?? []).map((step, index) => (
                    <Box key={step.activityId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size='small'
                        variant={activeTraceActivityId === step.activityId ? 'contained' : 'outlined'}
                        color={step.completed ? 'success' : 'warning'}
                        onClick={() => setSelectedTraceActivityId(step.activityId)}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        {index + 1}. {step.activityName || step.activityId}{step.completed ? ' ✓' : ''}
                      </Button>
                      {index < (processTraceQuery.data?.length ?? 0) - 1 && <Typography color='text.secondary'>→</Typography>}
                    </Box>
                  ))}
                </Box>

                {activeTraceActivityId && (
                  (() => {
                    const event = processTraceQuery.data?.find((item) => item.activityId === activeTraceActivityId);
                    if (!event) return null;
                    if (event.synthetic) {
                      return (
                        <Box sx={{ p: 2, mb: 2, borderRadius: 2, border: 1, borderColor: 'warning.light', bgcolor: 'warning.50' }}>
                          <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                            Étape théorique : {event.activityName || event.activityId}
                          </Typography>
                          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                            Étape du modèle sans trace historique directe enregistrée.
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ p: 2, mb: 2, borderRadius: 2, border: 1, borderColor: 'primary.light', bgcolor: 'primary.50' }}>
                        <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                          Événement : {event.activityName || event.activityId}
                        </Typography>
                        <Typography variant='body2'>Type : {event.activityType}</Typography>
                        <Typography variant='body2'>Démarré : {event.startTime ? new Date(event.startTime).toLocaleString() : 'Non enregistré'}</Typography>
                        <Typography variant='body2'>Terminé : {event.endTime ? new Date(event.endTime).toLocaleString() : 'En cours'}</Typography>
                        <Typography variant='body2'>Tâche : {event.taskId || 'Aucune tâche utilisateur'}</Typography>
                        <Typography variant='body2'>Assigné : {event.assignee || 'Flowable / Système'}</Typography>
                      </Box>
                    );
                  })()
                )}

                <Typography variant='subtitle2' sx={{ fontWeight: 800, mb: 1 }}>
                  Variables du processus & preuves
                </Typography>
                {typeof flowableDetailQuery.data?.variables.identityDocumentName === 'string' && (
                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<Download size={16} />}
                    onClick={() => void downloadIdentityDocument()}
                    sx={{ mb: 1.5, textTransform: 'none' }}
                  >
                    Télécharger la pièce d'identité
                  </Button>
                )}
                <Box component='pre' sx={{ m: 0, p: 2, borderRadius: 2, bgcolor: 'grey.900', color: 'grey.100', overflow: 'auto', fontSize: 12 }}>
                  {JSON.stringify(flowableDetailQuery.data?.variables ?? {}, null, 2)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Database size={16} />
                  <Typography variant='caption' color='text.secondary'>
                    Variables extraites du moteur Flowable BPMN. Décision enregistrée dans la piste d'audit.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* ── TAB 3: SUPPORT TICKETS ── */}
      {activeTab === 'tickets' && (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 0, overflowX: 'auto' }}>
            <Box sx={{ p: 2.5, pb: 1 }}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>Tickets de support client</Typography>
              <Typography variant='body2' color='text.secondary'>
                Gestion des demandes d'assistance, réclamations et réponses assistées.
              </Typography>
            </Box>
            {ticketDownloadError && (
              <Alert severity='error' sx={{ m: 2 }}>{ticketDownloadError}</Alert>
            )}
            {ticketsQuery.isError && (
              <Alert severity='error' sx={{ m: 2 }}>Les tickets n'ont pas pu être chargés. Actualisez pour réessayer.</Alert>
            )}
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Type / Priorité</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(ticketsQuery.data?.content ?? []).map((ticket) => (
                  <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(ticket)}>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 700 }}>#{ticket.id} · {ticket.subject}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {ticket.customerName || ticket.userId}{ticket.customerEmail ? ` · ${ticket.customerEmail}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`${ticket.ticketType} · ${ticket.priority}`} size='small' variant='outlined' />
                    </TableCell>
                    <TableCell>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={ticket.status}
                        color={ticket.status === 'OPEN' ? 'warning' : ticket.status === 'RESOLVED' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                        }}
                      >
                        Traiter
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {ticketsQuery.data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align='center'>
                      <Typography variant='body2' color='text.secondary' sx={{ py: 4 }}>
                        Aucun ticket de support pour le moment.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component='div'
              count={ticketsQuery.data?.totalElements ?? 0}
              page={ticketPage}
              onPageChange={(_, nextPage) => setTicketPage(nextPage)}
              rowsPerPage={20}
              rowsPerPageOptions={[20]}
            />
          </CardContent>
        </Card>
      )}

      {/* Global Ticket Handling Dialog */}
      <Dialog
        open={Boolean(selectedTicket)}
        onClose={() => {
          setSelectedTicket(null);
          setTicketComment('');
          setAiQuestion('');
          setTicketActionError(null);
          setAiDraftError(null);
        }}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Ticket #{selectedTicket?.id} · {selectedTicket?.subject}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant='body2'><strong>Client :</strong> {selectedTicket?.customerName || selectedTicket?.userId}{selectedTicket?.customerEmail ? ` · ${selectedTicket.customerEmail}` : ''}</Typography>
            <Typography variant='body2'><strong>Type / Priorité :</strong> {selectedTicket?.ticketType} · {selectedTicket?.priority}</Typography>
            <Typography variant='body2'><strong>Date de création :</strong> {selectedTicket?.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : '—'}</Typography>
            <Typography variant='subtitle2' sx={{ fontWeight: 800, mt: 1 }}>Description</Typography>
            <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{selectedTicket?.description || 'Aucune description fournie.'}</Typography>
            {ticketDownloadError && <Alert severity='error'>{ticketDownloadError}</Alert>}
            {selectedTicket?.attachmentName && (
              <Button
                variant='outlined'
                startIcon={<Download size={16} />}
                onClick={() => void downloadTicketAttachment(selectedTicket)}
              >
                Télécharger {selectedTicket.attachmentName}
              </Button>
            )}
            {selectedTicket?.ticketType === 'GENERAL' && (
              <>
                <Typography variant='subtitle2' sx={{ fontWeight: 800, mt: 1 }}>Traitement de la demande client</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Sollicitez une proposition de réponse assistée, éditez-la puis envoyez-la au client.
                </Typography>
                <TextField
                  label='Question pour l’assistant'
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  placeholder='Exemple : Expliquer la démarche pour contester ce paiement par carte.'
                  multiline
                  minRows={2}
                  maxRows={4}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                  helperText={`${aiQuestion.length}/1000`}
                  disabled={selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED' || aiDraftMutation.isPending}
                  fullWidth
                />
                <Button
                  variant='outlined'
                  startIcon={<Sparkles size={16} />}
                  disabled={!aiQuestion.trim() || aiDraftMutation.isPending || selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED'}
                  onClick={() => aiDraftMutation.mutate({
                    ticketId: selectedTicket.id,
                    question: aiQuestion.trim(),
                  })}
                >
                  {aiDraftMutation.isPending ? 'Génération…' : 'Générer une proposition'}
                </Button>
                {aiDraftMutation.isError && (
                  <Alert severity='error'>
                    Échec de génération : {aiDraftError || 'veuillez rédiger manuellement la réponse.'}
                  </Alert>
                )}
                <TextField
                  label='Réponse finale adressée au client'
                  value={ticketComment}
                  onChange={(event) => setTicketComment(event.target.value)}
                  multiline
                  minRows={3}
                  maxRows={8}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                  helperText={`${ticketComment.length}/2000 · Vérifiez attentivement avant envoi`}
                  disabled={selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED' || ticketActionMutation.isPending || aiDraftMutation.isPending}
                  fullWidth
                />
                {ticketActionError && <Alert severity='error'>{ticketActionError}</Alert>}
                {ticketActionMutation.isError && !ticketActionError && (
                  <Alert severity='error'>L'action sur le ticket a échoué. Veuillez réessayer.</Alert>
                )}
                {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {selectedTicket.status === 'OPEN' && (
                      <Button
                        variant='outlined'
                        disabled={ticketActionMutation.isPending}
                        onClick={() => ticketActionMutation.mutate({
                          ticketId: selectedTicket.id,
                          action: 'TAKE_OWNERSHIP',
                          comment: ticketComment.trim() || undefined,
                        })}
                      >
                        Prendre en charge
                      </Button>
                    )}
                    <Button
                      variant='outlined'
                      disabled={ticketActionMutation.isPending || !ticketComment.trim()}
                      onClick={() => ticketActionMutation.mutate({
                        ticketId: selectedTicket.id,
                        action: 'SEND_UPDATE',
                        comment: ticketComment.trim(),
                      })}
                    >
                      Envoyer la réponse
                    </Button>
                    <Button
                      variant='contained'
                      color='success'
                      disabled={ticketActionMutation.isPending || !ticketComment.trim()}
                      onClick={() => ticketActionMutation.mutate({
                        ticketId: selectedTicket.id,
                        action: 'RESOLVE',
                        comment: ticketComment.trim(),
                      })}
                    >
                      Résoudre le ticket
                    </Button>
                  </Stack>
                )}
                {selectedTicket.status === 'RESOLVED' && (
                  <Alert severity='success'>Ticket résolu{selectedTicket.resolvedAt ? ` le ${new Date(selectedTicket.resolvedAt).toLocaleString()}` : ''}.</Alert>
                )}
                {selectedTicket.status === 'CLOSED' && <Alert severity='info'>Ce ticket est clôturé.</Alert>}
              </>
            )}
            {selectedTicket && selectedTicket.ticketType !== 'GENERAL' && (
              <Alert severity='info'>
                Ce ticket est rattaché à un workflow dédié. Vous pouvez le valider dans l'onglet Workflows BPMN.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSelectedTicket(null);
            setTicketComment('');
            setAiQuestion('');
            setTicketActionError(null);
            setAiDraftError(null);
          }} disabled={ticketActionMutation.isPending}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
