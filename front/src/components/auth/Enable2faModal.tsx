import { useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';

type Props = {
  open: boolean;
  otpauthUri?: string | null;
  secret?: string | null;
  onClose: () => void;
  onEnable: (code: number) => Promise<boolean>;
};

export default function Enable2faModal({ open, otpauthUri, secret, onClose, onEnable }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const ok = await onEnable(parseInt(code, 10));
      if (!ok) setError('Invalid code');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Enable failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>Enable Two-factor authentication</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            Scan this QR code with your authenticator app, then enter the 6-digit code to enable 2FA.
          </Typography>

          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            {otpauthUri && <QRCodeCanvas value={otpauthUri} size={160} />}
            {secret && <Typography variant='body2' color='text.secondary'>Secret: {secret}</Typography>}

            <TextField label='6-digit code' value={code} onChange={e => setCode(e.target.value)} slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }} />

            {error && <Typography color='error' variant='body2'>{error}</Typography>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, width: '100%' }}>
              <Button onClick={onClose} disabled={loading}>Cancel</Button>
              <Button variant='contained' onClick={submit} disabled={loading || code.length < 6}>Enable</Button>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
