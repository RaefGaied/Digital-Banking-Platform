import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Card, CardContent, Divider, Stack, TextField, Typography, InputAdornment } from '@mui/material';
import { ArrowRight, Loader2, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import TwoFactorModal from '../components/auth/TwoFactorModal';
import { useI18n } from '../i18n/I18nContext';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const { verify2fa } = useAuth();
  const { locale } = useI18n();
  const [show2fa, setShow2fa] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const text = locale === 'fr'
    ? {
        privateBanking: 'Banque privee',
        heroTitle1: 'Votre argent,',
        heroTitle2: 'vos regles.',
        heroDesc: 'Une banque concue pour celles et ceux qui exigent simplicite, securite et controle total de leurs finances.',
        activeUsers: 'Utilisateurs actifs',
        transactions: 'Transactions',
        countries: 'Pays',
        uptime: 'Disponibilite',
        secureAccess: 'Acces securise',
        welcomeBack: 'Bon retour',
        signInPrompt: 'Connectez-vous pour acceder a votre compte',
        emailAddress: 'Adresse e-mail',
        password: 'Mot de passe',
        forgotPassword: 'Mot de passe oublie ?',
        signIn: 'Se connecter',
        securityNote: 'Protege par chiffrement 256 bits et authentification a deux facteurs. Vos donnees restent securisees.',
        noAccount: 'Pas de compte ?',
        createOne: 'En creer un',
      }
    : {
        privateBanking: 'Private Banking',
        heroTitle1: 'Your money,',
        heroTitle2: 'your rules.',
        heroDesc: 'Banking designed for those who demand simplicity, security and full control of their finances.',
        activeUsers: 'Active Users',
        transactions: 'Transactions',
        countries: 'Countries',
        uptime: 'Uptime',
        secureAccess: 'Secure access',
        welcomeBack: 'Welcome back',
        signInPrompt: 'Sign in to access your account',
        emailAddress: 'Email address',
        password: 'Password',
        forgotPassword: 'Forgot password?',
        signIn: 'Sign In',
        securityNote: 'Protected by 256-bit encryption and two-factor authentication. Your data is always safe.',
        noAccount: "Don't have an account?",
        createOne: 'Create one',
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await login({ email, password });
    if (response) {
      if (response.twoFactorRequired) {
        setTempToken(response.tempToken || null);
        setShow2fa(true);
        return;
      }
      navigate(response.role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  };

  const handleVerify = async (token: string, code: number) => {
    const ok = await verify2fa(token, code);
    if (ok) {
      setShow2fa(false);
      setTempToken(null);
      navigate('/dashboard');
    }
    return ok;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
          width: '50%',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.35, background: 'radial-gradient(circle at top left, rgba(232,97,26,0.16), transparent 34%), radial-gradient(circle at bottom right, rgba(232,97,26,0.08), transparent 28%)' }} />
        <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 3, bgcolor: 'primary.main', display: 'grid', placeItems: 'center', color: 'primary.contrastText', fontWeight: 800 }}>
            $
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800 }}>FinBank</Typography>
        </Stack>

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
          <Typography variant='overline' sx={{ color: 'primary.main', letterSpacing: 3 }}>
            {text.privateBanking}
          </Typography>
          <Typography variant='h2' sx={{ mt: 1, mb: 2, fontWeight: 800, lineHeight: 1.05 }}>
            {text.heroTitle1}<Box component='span' sx={{ color: 'primary.main' }}> {text.heroTitle2}</Box>
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 420, lineHeight: 1.8 }}>
            {text.heroDesc}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2, position: 'relative', zIndex: 1, maxWidth: 520 }}>
          {[
            { label: text.activeUsers, value: '2M+' },
            { label: text.transactions, value: '$1B+' },
            { label: text.countries, value: '30+' },
            { label: text.uptime, value: '99.9%' },
          ].map(stat => (
            <Card key={stat.label} variant='outlined' sx={{ p: 2, borderRadius: 4, bgcolor: 'background.paper' }}>
              <Typography variant='h5' sx={{ fontWeight: 800 }}>{stat.value}</Typography>
              <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 1.2 }}>
                {stat.label}
              </Typography>
            </Card>
          ))}
        </Box>
      </Box>

      <Box sx={{ width: { xs: '100%', lg: '50%' }, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 4, md: 6 } }}>
        <Card sx={{ width: '100%', maxWidth: 520, borderRadius: 5 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <ThemeToggle />
            </Box>

            <Stack spacing={0.75} sx={{ mb: 4 }}>
              <Typography variant='overline' sx={{ color: 'primary.main', letterSpacing: 3 }}>
                {text.secureAccess}
              </Typography>
              <Typography variant='h3' sx={{ fontWeight: 800, lineHeight: 1.05 }}>
                {text.welcomeBack}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {text.signInPrompt}
              </Typography>
            </Stack>

            {error && (
              <Box sx={{ mb: 3, p: 2, borderRadius: 3, bgcolor: 'error.main', color: 'error.contrastText' }}>
                <Typography variant='body2'>{error}</Typography>
              </Box>
            )}

            <Box component='form' onSubmit={handleSubmit}>
              <Stack spacing={2.25}>
                <TextField
                  label={text.emailAddress}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type='email'
                  autoComplete='username'
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Mail className='h-4 w-4 text-gray-400' />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label={text.password}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <Button type='button' onClick={() => setShowPassword(v => !v)} sx={{ minWidth: 'auto', p: 0, color: 'text.secondary' }}>
                            {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                          </Button>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  type='submit'
                  variant='contained'
                  size='large'
                  disabled={loading}
                  endIcon={loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <ArrowRight className='h-4 w-4' />}
                  sx={{ py: 1.6 }}
                >
                  {text.signIn}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
              <ShieldCheck className='mr-2 inline h-4 w-4 text-primary-500' />
              {text.securityNote}
            </Typography>

            <Typography variant='body2' sx={{ mt: 3 }}>
              {text.noAccount}{' '}
              <Box component={Link} to='/register' sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none' }}>
                {text.createOne}
              </Box>
            </Typography>
          </CardContent>
        </Card>
      </Box>
          <TwoFactorModal open={show2fa} tempToken={tempToken} onClose={() => setShow2fa(false)} onVerify={handleVerify} />
    </Box>
  );
}
