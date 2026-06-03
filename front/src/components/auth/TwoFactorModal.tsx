import { useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';

type Props = {
  open: boolean;
  tempToken: string | null;
  onClose: () => void;
  onVerify: (tempToken: string, code: number) => Promise<boolean>;
};

export default function TwoFactorModal({ open, tempToken, onClose, onVerify }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!tempToken) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await onVerify(tempToken, parseInt(code, 10));
      if (!ok) setError('Invalid code');
    } catch (e: any) {
      setError(e?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>Two-factor authentication</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            Enter the 6-digit code from your authenticator app.
          </Typography>

          <Stack spacing={2}>
            <TextField
              label='6-digit code'
              value={code}
              onChange={e => setCode(e.target.value)}
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  maxLength: 6,
                },
              }}
            />

            {error && <Typography color='error' variant='body2'>{error}</Typography>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={onClose} disabled={loading}>Cancel</Button>
              <Button variant='contained' onClick={submit} disabled={loading || code.length < 6}>Verify</Button>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
