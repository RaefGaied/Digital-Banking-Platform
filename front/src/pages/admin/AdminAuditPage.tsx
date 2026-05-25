import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Chip, TablePagination, Typography } from '@mui/material';
import { adminApi } from '../../api/admin';

export default function AdminAuditPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const auditQuery = useQuery({ queryKey: ['admin-audit-logs', page, rowsPerPage], queryFn: () => adminApi.getAuditLogs(page, rowsPerPage) });

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          Audit log
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Browse the latest tracked actions and system events.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2 }}>
        {auditQuery.data?.content.map((entry) => (
          <Card key={entry.id} sx={{ borderRadius: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                  <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                    {entry.action}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {entry.userEmail || 'system'} · {entry.entity || 'N/A'}
                  </Typography>
                </Box>
                <Chip label={entry.status} size='small' variant='outlined' />
              </Box>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                {entry.details || 'No details available'}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ py: 0 }}>
          <TablePagination
            component='div'
            count={auditQuery.data?.totalElements ?? 0}
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
