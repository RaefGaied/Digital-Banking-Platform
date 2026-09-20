import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { authApi } from '../api/auth';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(params.get('token') || '', password);
      navigate('/login', { replace: true, state: { message: 'Mot de passe modifié avec succès.' } });
    } catch {
      setError('Le lien est invalide ou expiré. Demandez un nouveau lien.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={2.5}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Nouveau mot de passe</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Box component="form" onSubmit={submit}>
              <Stack spacing={2}>
                <TextField required fullWidth type="password" label="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} slotProps={{ htmlInput: { minLength: 8 } }} />
                <TextField required fullWidth type="password" label="Confirmer le mot de passe" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} slotProps={{ htmlInput: { minLength: 8 } }} />
                <Button type="submit" variant="contained" size="large" disabled={loading || !params.get('token')}>
                  {loading ? 'Enregistrement...' : 'Modifier le mot de passe'}
                </Button>
              </Stack>
            </Box>
            <Typography component={Link} to="/login" sx={{ color: 'primary.main', textDecoration: 'none' }}>Retour à la connexion</Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
