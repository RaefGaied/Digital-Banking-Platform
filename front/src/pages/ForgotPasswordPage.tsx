import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { ArrowLeft, Mail } from 'lucide-react';
import { authApi } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Impossible de traiter la demande. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={2.5}>
            <Box component={Link} to="/login" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'text.secondary', textDecoration: 'none' }}>
              <ArrowLeft size={18} /> Retour à la connexion
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Mot de passe oublié ?</Typography>
            <Typography color="text.secondary">
              Saisissez votre adresse e-mail. Si un compte existe, vous recevrez un lien de réinitialisation.
            </Typography>
            {sent ? (
              <Alert severity="success">Vérifiez votre boîte e-mail pour continuer la réinitialisation.</Alert>
            ) : (
              <Box component="form" onSubmit={submit}>
                <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <TextField
                    required
                    fullWidth
                    type="email"
                    label="Adresse e-mail"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    slotProps={{ input: { startAdornment: <Mail size={18} /> } }}
                  />
                  <Button type="submit" variant="contained" size="large" disabled={loading}>
                    {loading ? 'Envoi...' : 'Recevoir le lien'}
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
