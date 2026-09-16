import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { Box, Button, Card, CardContent, Chip, IconButton, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';

export default function AdminTasksPage() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const tasksQuery = useQuery({ queryKey: ['admin-tasks', page, rowsPerPage], queryFn: () => adminApi.getTasks(page, rowsPerPage) });
  const selectedTaskQuery = useQuery({
    queryKey: ['admin-task', selectedTaskId],
    queryFn: () => adminApi.getTask(selectedTaskId as string),
    enabled: selectedTaskId !== null,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });

  const actMutation = useMutation({
    mutationFn: ({ taskId, action }: { taskId: string; action: 'APPROVE' | 'REJECT' }) =>
      adminApi.actOnTask(taskId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-task', selectedTaskId] });
      setSelectedTaskId(null);
    },
  });

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
