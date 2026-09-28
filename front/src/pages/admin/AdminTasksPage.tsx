import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, X, Eye, GitBranch, Clock3, Database, ShieldCheck, Sparkles } from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { AdminTicketSummary, FlowableProcessSummary } from '../../types';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';

function getProcessStatus(process?: FlowableProcessSummary) {
  if (!process) return 'Completed';
  if (process.active) return 'In progress';
  if (process.deleteReason) return 'Cancelled';
  if (/approv/i.test(process.endActivityId || '')) return 'Approved';
  if (/reject/i.test(process.endActivityId || '')) return 'Rejected';
  return process.endActivityId || 'Completed';
}

export default function AdminTasksPage() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedProcessInstanceId, setSelectedProcessInstanceId] = useState<string | null>(null);
  const [selectedTraceActivityId, setSelectedTraceActivityId] = useState<string | null>(null);
  const [processPage, setProcessPage] = useState(0);
  const [ticketPage, setTicketPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketSummary | null>(null);
  const [ticketComment, setTicketComment] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [ticketActionError, setTicketActionError] = useState<string | null>(null);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [submittedDecision, setSubmittedDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const tasksQuery = useQuery({ queryKey: ['admin-tasks', page, rowsPerPage], queryFn: () => adminApi.getTasks(page, rowsPerPage) });
  const flowableTasksQuery = useQuery({ queryKey: ['admin-flowable-tasks'], queryFn: adminApi.getFlowableTasks });
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
    mutationFn: ({ taskId, approved }: { taskId: string; approved: boolean }) =>
      adminApi.completeFlowableTask(taskId, approved),
    onMutate: ({ approved }) => {
      setSubmittedDecision(approved ? 'APPROVE' : 'REJECT');
      setCompletionError(null);
    },
    onSuccess: () => {
      refresh();
    },
    onError: (error) => {
      setSubmittedDecision(null);
      setCompletionError(error instanceof Error ? error.message : 'Flowable could not complete this task.');
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
      setTicketActionError(error instanceof Error ? error.message : 'The ticket could not be updated.');
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
      setAiDraftError(error instanceof Error ? error.message : 'The AI could not draft a reply.');
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

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 800 }}>
            Admin inbox
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Review tasks, tickets, and workflow items.
          </Typography>
        </Box>
        <IconButton onClick={refresh} sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <RefreshCw className='h-4 w-4' />
        </IconButton>
      </Box>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 0, overflowX: 'auto' }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Task</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
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
                </TableRow>
              ))}
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

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                BPMN workflow history
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Active and completed workflows with their recorded execution traces.
              </Typography>
            </Box>
            <Chip label={`${flowableProcessesQuery.data?.totalElements ?? 0} total`} color='primary' variant='outlined' />
          </Box>
          {flowableProcessesQuery.isError && (
            <Alert severity='error' sx={{ mb: 2 }}>Workflow history could not be loaded. Refresh to retry.</Alert>
          )}
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Process</TableCell>
                  <TableCell>BPMN workflow</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Finished</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(flowableProcessesQuery.data?.content ?? []).map((process) => {
                  const activeTask = (flowableTasksQuery.data ?? []).find((task) => task.processInstanceId === process.id);
                  return (
                  <TableRow key={process.id} hover sx={{ cursor: 'pointer' }} onClick={() => {
                    setSelectedProcessInstanceId(process.id);
                    setSelectedTraceActivityId(null);
                    setSubmittedDecision(null);
                    setCompletionError(null);
                  }}>
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
                        <Button size='small' startIcon={<Eye size={15} />} onClick={() => {
                          setSelectedProcessInstanceId(process.id);
                          setSelectedTraceActivityId(null);
                          setSubmittedDecision(null);
                          setCompletionError(null);
                        }}>Trace</Button>
                        {activeTask && (
                          <>
                            <Button
                              size='small'
                              variant='contained'
                              color='success'
                              startIcon={<Check size={16} />}
                              onClick={(event) => {
                                event.stopPropagation();
                                flowableMutation.mutate({ taskId: activeTask.id, approved: true });
                              }}
                              disabled={flowableMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size='small'
                              variant='outlined'
                              color='error'
                              startIcon={<X size={16} />}
                              onClick={(event) => {
                                event.stopPropagation();
                                flowableMutation.mutate({ taskId: activeTask.id, approved: false });
                              }}
                              disabled={flowableMutation.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );})}
                {flowableProcessesQuery.data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align='center'>
                      <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                        No Flowable process history is available.
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

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 0, overflowX: 'auto' }}>
          <Box sx={{ p: 2, pb: 0 }}>
            <Typography variant='h6' sx={{ fontWeight: 800 }}>Support tickets</Typography>
            <Typography variant='body2' color='text.secondary'>Review submitted tickets, descriptions, and resolution status.</Typography>
          </Box>
          {ticketsQuery.isError && (
            <Alert severity='error' sx={{ m: 2 }}>Support tickets could not be loaded. Refresh to retry.</Alert>
          )}
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Ticket</TableCell>
                <TableCell>Type / priority</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align='right'>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(ticketsQuery.data?.content ?? []).map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 700 }}>#{ticket.id} · {ticket.subject}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {ticket.customerName || ticket.userId}{ticket.customerEmail ? ` · ${ticket.customerEmail}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{ticket.ticketType} · {ticket.priority}</TableCell>
                  <TableCell>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}</TableCell>
                  <TableCell><Chip size='small' label={ticket.status} variant='outlined' /></TableCell>
                  <TableCell align='right'>
                    <Button size='small' startIcon={<Eye size={15} />} onClick={() => {
                      setSelectedTicket(ticket);
                      setTicketComment('');
                      setAiQuestion('');
                      setTicketActionError(null);
                      setAiDraftError(null);
                      aiDraftMutation.reset();
                    }}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
              {ticketsQuery.data?.content.length === 0 && (
                <TableRow><TableCell colSpan={5} align='center'>No support tickets found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component='div'
            count={ticketsQuery.data?.totalElements ?? 0}
            page={ticketPage}
            onPageChange={(_, nextPage) => setTicketPage(nextPage)}
            rowsPerPage={10}
            rowsPerPageOptions={[10]}
          />
        </CardContent>
      </Card>

      <Dialog open={selectedTicket !== null} onClose={() => {
        if (!ticketActionMutation.isPending) {
          setSelectedTicket(null);
          setTicketActionError(null);
        }
      }} fullWidth maxWidth='sm'>
        <DialogTitle>{selectedTicket?.subject || 'Ticket details'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant='body2'><strong>Ticket:</strong> #{selectedTicket?.id}</Typography>
            <Typography variant='body2'><strong>Status:</strong> {selectedTicket?.status}</Typography>
            <Typography variant='body2'><strong>Customer:</strong> {selectedTicket?.customerName || selectedTicket?.userId}{selectedTicket?.customerEmail ? ` · ${selectedTicket.customerEmail}` : ''}</Typography>
            <Typography variant='body2'><strong>Type / priority:</strong> {selectedTicket?.ticketType} · {selectedTicket?.priority}</Typography>
            <Typography variant='body2'><strong>Created:</strong> {selectedTicket?.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : '—'}</Typography>
            <Typography variant='subtitle2' sx={{ fontWeight: 800, mt: 1 }}>Description</Typography>
            <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{selectedTicket?.description || 'No description provided.'}</Typography>
            {selectedTicket?.ticketType === 'GENERAL' && (
              <>
                <Typography variant='subtitle2' sx={{ fontWeight: 800, mt: 1 }}>Handle this support request</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Ask the AI for a carefully grounded draft, review or edit it, then send the response yourself. The AI never sends messages or resolves tickets automatically.
                </Typography>
                <TextField
                  label='Question for the AI assistant'
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  placeholder='Example: Explain the steps the customer should follow to dispute this card payment.'
                  multiline
                  minRows={2}
                  maxRows={4}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                  helperText={`${aiQuestion.length}/1000 · The AI uses the ticket and verified help content when available`}
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
                  {aiDraftMutation.isPending ? 'Drafting…' : 'Ask AI for a draft'}
                </Button>
                {aiDraftMutation.isError && (
                  <Alert severity='error'>
                    AI drafting failed: {aiDraftError || 'review the provider status and try again, or write the response manually.'}
                  </Alert>
                )}
                <TextField
                  label='Review and edit the message to the customer'
                  value={ticketComment}
                  onChange={(event) => setTicketComment(event.target.value)}
                  multiline
                  minRows={3}
                  maxRows={8}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                  helperText={`${ticketComment.length}/2000 · AI drafts are suggestions; review before sending`}
                  disabled={selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED' || ticketActionMutation.isPending || aiDraftMutation.isPending}
                  fullWidth
                />
                {ticketActionError && <Alert severity='error'>{ticketActionError}</Alert>}
                {ticketActionMutation.isError && !ticketActionError && (
                  <Alert severity='error'>The ticket action failed. Please try again.</Alert>
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
                        Take ownership
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
                      Send response
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
                      Resolve with explanation
                    </Button>
                  </Stack>
                )}
                {selectedTicket.status === 'RESOLVED' && (
                  <Alert severity='success'>Resolved{selectedTicket.resolvedAt ? ` on ${new Date(selectedTicket.resolvedAt).toLocaleString()}` : ''}.</Alert>
                )}
                {selectedTicket.status === 'CLOSED' && <Alert severity='info'>This ticket is closed.</Alert>}
              </>
            )}
            {selectedTicket && selectedTicket.ticketType !== 'GENERAL' && (
              <Alert severity='info'>
                This ticket follows its dedicated workflow. Handle its approval or rejection in the workflow task queue.
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
          }} disabled={ticketActionMutation.isPending}>Close</Button>
        </DialogActions>
      </Dialog>

      {selectedProcessInstanceId && (
        <Card sx={{ borderRadius: 4, border: 1, borderColor: 'warning.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                  <GitBranch size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  Workflow execution #{selectedProcessInstanceId}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {selectedFlowableTaskIsActive
                    ? 'Live supervision of the current BPMN path, process variables and decision evidence.'
                    : 'Historical supervision of the BPMN path, process variables and decision evidence.'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size='small'
                  label={getProcessStatus(selectedProcess)}
                  color={selectedProcess?.active ? 'warning' : selectedProcess?.deleteReason ? 'default' : 'success'}
                  variant='outlined'
                />
                <Button size='small' onClick={() => setSelectedProcessInstanceId(null)}>Close</Button>
              </Box>
            </Box>
            {flowableDetailQuery.isLoading && (
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Loading workflow variables…
              </Typography>
            )}
            {flowableDetailQuery.isError && (
              <Alert severity='error' sx={{ mb: 2 }}>
                Workflow variables could not be loaded. Refresh and try again.
              </Alert>
            )}
            {flowableMutation.isPending && (
              <Alert severity='info' sx={{ mb: 2 }}>
                Sending {submittedDecision === 'APPROVE' ? 'approval' : 'rejection'} to Flowable…
              </Alert>
            )}
            {submittedDecision && !flowableMutation.isPending && !completionError && (
              <Alert severity='success' sx={{ mb: 2 }}>
                Decision <strong>{submittedDecision}</strong> submitted successfully. The workflow supervision remains open and is now showing its latest state.
              </Alert>
            )}
            {completionError && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {completionError}
              </Alert>
            )}
            {selectedProcess && !selectedProcess.active && (
              <Alert severity={/approv|success|complete/i.test(selectedProcess.endActivityId || '') ? 'success' : 'info'} sx={{ mb: 2 }}>
                <strong>Final result:</strong>{' '}
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
                ['Recorded activities', traceEvents.length, <Clock3 size={16} />],
                ['Completed activities', completedTraceEvents.length, <ShieldCheck size={16} />],
                ['Human tasks', traceEvents.filter((event) => event.activityType === 'userTask').length, <Eye size={16} />],
                ['Workflow state', getProcessStatus(selectedProcess), <Check size={16} />],
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
              {hasSyntheticTrace ? 'BPMN model stages (execution history unavailable)' : 'Click an event to inspect its real BPMN execution details'}
            </Typography>
            {processTraceQuery.isLoading && (
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Loading the Flowable execution trace…
              </Typography>
            )}
            {processTraceQuery.isError && (
              <Typography variant='body2' color='error.main' sx={{ mb: 2 }}>
                The Flowable trace could not be loaded. Refresh the task to try again.
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

            {processTraceQuery.data?.length === 0 && (
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                No historical events are available for this process yet. The active task may have been created before Flowable history was enabled.
              </Typography>
            )}

            {activeTraceActivityId && (
              (() => {
                const event = processTraceQuery.data?.find((item) => item.activityId === activeTraceActivityId);
                if (!event) return null;
                if (event.synthetic) {
                  return (
                    <Box sx={{ p: 2, mb: 2, borderRadius: 2, border: 1, borderColor: 'warning.light', bgcolor: 'warning.50' }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                        BPMN model stage: {event.activityName || event.activityId}
                      </Typography>
                      <Typography variant='body2' sx={{ mt: 1 }}>
                        This is a process-model stage, not a recorded Flowable activity.
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Exact execution details are unavailable because this process was created before Flowable activity history was enabled.
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        No reliable timestamp, task ID, assignee, or completion state is available for this stage.
                      </Typography>
                    </Box>
                  );
                }
                return (
                  <Box sx={{ p: 2, mb: 2, borderRadius: 2, border: 1, borderColor: 'primary.light', bgcolor: 'primary.50' }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                      Event details: {event.activityName || event.activityId}
                    </Typography>
                    <Typography variant='body2'>Type: {event.activityType}</Typography>
                    <Typography variant='body2'>Started: {event.startTime ? new Date(event.startTime).toLocaleString() : 'Not recorded'}</Typography>
                    <Typography variant='body2'>Completed: {event.endTime ? new Date(event.endTime).toLocaleString() : 'In progress'}</Typography>
                    <Typography variant='body2'>Task: {event.taskId || 'No user task'}</Typography>
                    <Typography variant='body2'>Assignee: {event.assignee || 'Flowable / system'}</Typography>
                  </Box>
                );
              })()
            )}

            <Typography variant='subtitle2' sx={{ fontWeight: 800, mb: 1 }}>
              Process variables and evidence
            </Typography>
            <Box component='pre' sx={{ m: 0, p: 2, borderRadius: 2, bgcolor: 'grey.900', color: 'grey.100', overflow: 'auto', fontSize: 12 }}>
              {JSON.stringify(flowableDetailQuery.data?.variables ?? {}, null, 2)}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <Database size={16} />
              <Typography variant='caption' color='text.secondary'>
                Variables are read from Flowable runtime or history. Approve or reject only after reviewing this evidence.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

          {selectedTaskId && selectedTaskQuery.data?.task && (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Typography variant='h6' sx={{ fontWeight: 800 }}>
              Task details #{selectedTaskId}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {selectedTaskQuery.data.task.description || selectedTaskQuery.data.task.ticket?.description}
            </Typography>
                {selectedTaskQuery.data.task.ticket?.ticketType === 'GENERAL' ? (
                  <Alert severity='info' sx={{ mt: 2 }}>
                    General support tickets are not approval decisions. Open the ticket in Support tickets to take ownership, request information, or resolve it with a customer-facing explanation.
                  </Alert>
                ) : (
                <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant='contained'
                    color='success'
                    onClick={() => actMutation.mutate({ taskId: selectedTaskId, action: 'APPROVE' })}
                    disabled={actMutation.status === 'pending'}
                  >
                    Approve
                  </Button>
                  <Button
                    variant='outlined'
                    color='error'
                    onClick={() => actMutation.mutate({ taskId: selectedTaskId, action: 'REJECT' })}
                    disabled={actMutation.status === 'pending'}
                  >
                    Reject
                  </Button>
                </Stack>
                )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
