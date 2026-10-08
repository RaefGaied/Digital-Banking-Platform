import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Chip, TablePagination, Typography } from '@mui/material';
import { adminApi } from '../../api/admin';

const ACTION_LABELS: Record<string, string> = {
  ADMIN_RESOLVE_SECURITY_EVENT: 'Security event resolved',
  LOGIN: 'Login',
  LOGIN_FAILURE: 'Failed login',
  LOGIN_2FA_REQUIRED: 'Login – 2FA required',
};

const prettyAction = (action: string) =>
  ACTION_LABELS[action] ??
  action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

interface DetailsView {
  headline: string;
  fields: { label: string; value: string }[];
}

// Details use "Label: value" lines; indented lines continue the previous field.
const parseDetails = (details: string | null): DetailsView => {
  const lines = (details ?? '').replace(/\r\n/g, '\n').split('\n');
  const fields: { label: string; value: string }[] = [];
  const headlineParts: string[] = [];
  for (const line of lines) {
    const match = /^([A-Z][A-Za-z ]{1,40}):\s?(.*)$/.exec(line);
    if (match && !/^\s/.test(line)) {
      fields.push({ label: match[1], value: match[2] });
    } else if (fields.length > 0) {
      const last = fields[fields.length - 1];
      last.value += (last.value ? '\n' : '') + line.replace(/^ {2}/, '');
    } else if (line.trim()) {
      headlineParts.push(line.trim());
    }
  }
  return { headline: headlineParts.join(' '), fields };
};

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
        {auditQuery.data?.content.map((entry) => {
          const view = parseDetails(entry.details);
          const failed = entry.status && entry.status.toUpperCase() !== 'SUCCESS';
          return (
          <Card key={entry.id} sx={{ borderRadius: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                  <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                    {prettyAction(entry.action)}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {entry.userEmail || 'system'}
                    {entry.entity ? ` · ${entry.entity}` : ''}
                    {entry.ipAddress ? ` · IP ${entry.ipAddress}` : ''}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                    {entry.entityId ? ` · ref ${entry.entityId.slice(0, 8)}` : ''}
                  </Typography>
                </Box>
                <Chip label={entry.status} size='small' color={failed ? 'error' : 'success'} variant='outlined' />
              </Box>
              {view.headline && (
                <Typography variant='body2' sx={{ mt: 2, fontWeight: 600 }}>
                  {view.headline}
                </Typography>
              )}
              {view.fields.length > 0 && (
                <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '190px 1fr' }, gap: 1, columnGap: 2 }}>
                  {view.fields.map((field, index) => (
                    <Box key={`${field.label}-${index}`} sx={{ display: 'contents' }}>
                      <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        {field.label}
                      </Typography>
                      <Typography variant='body2' sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                        {field.value || '—'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {!view.headline && view.fields.length === 0 && (
                <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                  No details available
                </Typography>
              )}
            </CardContent>
          </Card>
          );
        })}
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
