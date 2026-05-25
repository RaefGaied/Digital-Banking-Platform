import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Box, Button, Card, CardContent, Chip, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { adminApi } from '../../api/admin';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [userReason, setUserReason] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const usersQuery = useQuery({ queryKey: ['admin-users', page, rowsPerPage], queryFn: () => adminApi.getUsers(page, rowsPerPage) });

  const userMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) =>
      blocked ? adminApi.blockUser(userId, userReason) : adminApi.unblockUser(userId),
    onSuccess: async () => {
      setUserReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
  });

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          User management
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Review, block, or unblock users from a structured admin view.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 0, overflowX: 'auto' }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersQuery.data?.content.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 700 }}>{user.name}</Typography>
                    <Typography variant='caption' color='text.secondary'>{user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={user.status} size='small' variant='outlined' />
                  </TableCell>
                  <TableCell>
                    {user.status === 'BLOCKED' ? (
                      <Button
                        onClick={() => userMutation.mutate({ userId: user.id, blocked: false })}
                        variant='contained'
                        color='success'
                        size='small'
                      >
                        Unblock
                      </Button>
                    ) : (
                      <Button
                        onClick={() => userMutation.mutate({ userId: user.id, blocked: true })}
                        variant='contained'
                        color='error'
                        size='small'
                      >
                        Block
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component='div'
            count={usersQuery.data?.totalElements ?? 0}
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
          <Typography variant='subtitle1' sx={{ fontWeight: 700, mb: 2 }}>
            Block reason
          </Typography>
          <TextField
            value={userReason}
            onChange={(e) => setUserReason(e.target.value)}
            placeholder='Optional reason for blocking...'
            multiline
            minRows={3}
            fullWidth
          />
        </CardContent>
      </Card>
    </Box>
  );
}
