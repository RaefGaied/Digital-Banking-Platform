import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, X, Eye, GitBranch, Clock3, Database, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { Alert, Box, Button, Card, CardContent, Chip, IconButton, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';

export default function AdminTasksPage() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedFlowableTaskId, setSelectedFlowableTaskId] = useState<string | null>(null);
  const [selectedTraceActivityId, setSelectedTraceActivityId] = useState<string | null>(null);
  const [submittedDecision, setSubmittedDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const tasksQuery = useQuery({ queryKey: ['admin-tasks', page, rowsPerPage], queryFn: () => adminApi.getTasks(page, rowsPerPage) });
  const flowableTasksQuery = useQuery({ queryKey: ['admin-flowable-tasks'], queryFn: adminApi.getFlowableTasks });
  const selectedTaskQuery = useQuery({
    queryKey: ['admin-task', selectedTaskId],
    queryFn: () => adminApi.getTask(selectedTaskId as string),
    enabled: selectedTaskId !== null,
  });
  const flowableDetailQuery = useQuery({
    queryKey: ['admin-flowable-task', selectedFlowableTaskId],
    queryFn: () => adminApi.getFlowableTaskDetails(selectedFlowableTaskId as string),
    enabled: selectedFlowableTaskId !== null
      && (flowableTasksQuery.data ?? []).some((task) => task.id === selectedFlowableTaskId),
  });
  const processTraceQuery = useQuery({
    queryKey: ['admin-flowable-trace', flowableDetailQuery.data?.processInstanceId],
    queryFn: () => adminApi.getFlowableProcessTrace(flowableDetailQuery.data?.processInstanceId as string),
    enabled: !!flowableDetailQuery.data?.processInstanceId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    const firstActivity = processTraceQuery.data?.[0]?.activityId;
    if (firstActivity && !selectedTraceActivityId) {
      setSelectedTraceActivityId(firstActivity);
    }
  }, [processTraceQuery.data, selectedTraceActivityId]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-flowable-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-flowable-task', selectedFlowableTaskId] });
    void queryClient.invalidateQueries({ queryKey: ['admin-flowable-trace', flowableDetailQuery.data?.processInstanceId] });
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

  const hasSyntheticTrace = processTraceQuery.data?.some((event) => event.synthetic) ?? false;
  const selectedFlowableTaskIsActive = selectedFlowableTaskId !== null
    && (flowableTasksQuery.data ?? []).some((task) => task.id === selectedFlowableTaskId);
  const completionConfirmed = submittedDecision !== null && !flowableMutation.isPending && !completionError;
  const workflowProgress = completionConfirmed ? 100 : hasSyntheticTrace ? 0 : (
    processTraceQuery.data?.length
      ? Math.round((processTraceQuery.data.filter((event) => event.completed).length / processTraceQuery.data.length) * 100)
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
                BPMN validation tasks
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                High-value transfers waiting for an administrator decision.
              </Typography>
            </Box>
            <Chip label={`${flowableTasksQuery.data?.length ?? 0} active`} color='warning' variant='outlined' />
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Process</TableCell>
                  <TableCell>Task</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align='right'>Decision</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(flowableTasksQuery.data ?? []).map((task) => (
                  <TableRow key={task.id} hover sx={{ cursor: 'pointer' }}                   onClick={() => {
                    setSelectedFlowableTaskId(task.id);
                    setSelectedTraceActivityId(null);
                    setSubmittedDecision(null);
                    setCompletionError(null);
                  }}>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 700 }}>#{task.processInstanceId}</Typography>
                      <Typography variant='caption' color='text.secondary'>Task {task.id}</Typography>
                    </TableCell>
                    <TableCell>{task.name}</TableCell>
                    <TableCell>{new Date(task.createdTime).toLocaleString()}</TableCell>
                    <TableCell align='right'>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          size='small'
                          variant='contained'
                          color='success'
                          startIcon={<Check size={16} />}
                          onClick={() => flowableMutation.mutate({ taskId: task.id, approved: true })}
                          disabled={flowableMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size='small'
                          variant='outlined'
                          color='error'
                          startIcon={<X size={16} />}
                          onClick={() => flowableMutation.mutate({ taskId: task.id, approved: false })}
                          disabled={flowableMutation.isPending}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {flowableTasksQuery.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align='center'>
                      <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                        No active BPMN validation tasks.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      {selectedFlowableTaskId && flowableDetailQuery.data && (
        <Card sx={{ borderRadius: 4, border: 1, borderColor: 'warning.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                  <GitBranch size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  Workflow execution #{flowableDetailQuery.data.processInstanceId}
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
                  label={selectedFlowableTaskIsActive ? 'Active task' : 'Decision submitted'}
                  color={selectedFlowableTaskIsActive ? 'warning' : 'success'}
                  variant='outlined'
                />
                <Button size='small' onClick={() => setSelectedFlowableTaskId(null)}>Close</Button>
              </Box>
            </Box>
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
            {completionConfirmed && (
              <Alert severity={submittedDecision === 'APPROVE' ? 'success' : 'warning'} sx={{ mb: 2 }}>
                <strong>Résultat final :</strong>{' '}
                {submittedDecision === 'APPROVE'
                  ? 'étape 1 APPROVED à 100 %. La chaîne BPMN est terminée avec succès et le résultat métier a été exécuté.'
                  : 'étape 1 REJECTED à 100 %. La chaîne BPMN est terminée et le résultat métier a été refusé.'}
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
                ['Received', completionConfirmed ? true : hasSyntheticTrace ? null : true, <Clock3 size={16} />],
                ['Validated', completionConfirmed ? true : hasSyntheticTrace ? null : true, <ShieldCheck size={16} />],
                ['Human decision', completionConfirmed ? true : hasSyntheticTrace ? null : flowableDetailQuery.data.name.toLowerCase().includes('valid'), <Eye size={16} />],
                ['Execution', completionConfirmed ? true : hasSyntheticTrace ? null : false, <Check size={16} />],
              ].map(([label, done, icon]) => (
                <Box key={String(label)} sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: done === true ? 'success.light' : 'divider', bgcolor: done === true ? 'success.50' : 'background.default' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {icon}
                    <Typography variant='body2' sx={{ fontWeight: 700 }}>{label}</Typography>
                  </Box>
                  <Typography variant='caption' color={done === true ? 'success.main' : 'text.secondary'}>
                    {done === null ? 'History unavailable' : done ? 'Completed' : 'Waiting for this task'}
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
                    variant={selectedTraceActivityId === step.activityId ? 'contained' : 'outlined'}
                    color={step.completed || completionConfirmed ? 'success' : 'warning'}
                    onClick={() => setSelectedTraceActivityId(step.activityId)}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    {index + 1}. {step.activityName || step.activityId}{completionConfirmed ? ' ✓' : ''}
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

            {selectedTraceActivityId && (
              (() => {
                const event = processTraceQuery.data?.find((item) => item.activityId === selectedTraceActivityId);
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
              {JSON.stringify(flowableDetailQuery.data.variables, null, 2)}
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
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
