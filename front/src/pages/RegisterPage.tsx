import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Card, CardContent, Divider, Stack, TextField, Typography, InputAdornment } from '@mui/material';
import { ArrowRight, Loader2, ShieldCheck, User, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/I18nContext';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const { locale } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const text = locale === 'fr'
    ? {
        openAccount: 'Ouvrir un compte',
        heroTitle1: 'Commencez votre',
        heroTitle2: 'parcours financier.',
        heroDesc: 'Creez votre compte en quelques minutes et gardez le controle total de votre argent, partout.',
        zeroFees: 'Zero frais',
        encryption: 'Chiffrement',
        support: 'Support',
        satisfaction: 'Satisfaction',
        newAccount: 'Nouveau compte',
        createAccount: 'Creer un compte',
        joinUsers: "Rejoignez des milliers d'utilisateurs aujourd'hui",
        fullName: 'Nom complet',
        emailAddress: 'Adresse e-mail',
        password: 'Mot de passe',
        createAccountBtn: 'Creer le compte',
        securityNote: 'Vos donnees sont protegees par un chiffrement 256 bits. Nous ne partageons jamais vos informations.',
        alreadyHaveAccount: 'Vous avez deja un compte ?',
        signIn: 'Se connecter',
      }
    : {
        openAccount: 'Open an account',
        heroTitle1: 'Start your',
        heroTitle2: 'financial journey.',
        heroDesc: 'Create your account in minutes and take full control of your money, anywhere.',
        zeroFees: 'Zero fees',
        encryption: 'Encryption',
        support: 'Support',
        satisfaction: 'Satisfaction',
        newAccount: 'New account',
        createAccount: 'Create account',
        joinUsers: 'Join thousands of users today',
        fullName: 'Full name',
        emailAddress: 'Email address',
        password: 'Password',
        createAccountBtn: 'Create Account',
        securityNote: 'Your data is protected with 256-bit encryption. We never share your information.',
        alreadyHaveAccount: 'Already have an account?',
        signIn: 'Sign in',
      };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await register(form);
    if (success) navigate('/dashboard');
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
            {text.openAccount}
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
            { label: text.zeroFees, value: '0%' },
            { label: text.encryption, value: '256-bit' },
            { label: text.support, value: '24/7' },
            { label: text.satisfaction, value: '4.9★' },
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
                {text.newAccount}
              </Typography>
              <Typography variant='h3' sx={{ fontWeight: 800, lineHeight: 1.05 }}>
                {text.createAccount}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {text.joinUsers}
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
                  label={text.fullName}
                  name='name'
                  value={form.name}
                  onChange={handleChange}
                  autoComplete='name'
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <User className='h-4 w-4 text-gray-400' />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label={text.emailAddress}
                  name='email'
                  value={form.email}
                  onChange={handleChange}
                  type='email'
                  autoComplete='email'
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
                  name='password'
                  value={form.password}
                  onChange={handleChange}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='new-password'
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
                  {text.createAccountBtn}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
              <ShieldCheck className='mr-2 inline h-4 w-4 text-primary-500' />
              {text.securityNote}
            </Typography>

            <Typography variant='body2' sx={{ mt: 3 }}>
              {text.alreadyHaveAccount}{' '}
              <Box component={Link} to='/login' sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none' }}>
                {text.signIn}
              </Box>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
