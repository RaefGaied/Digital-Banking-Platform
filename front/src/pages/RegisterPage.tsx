import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  User,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  CreditCard,
  Zap,
  Globe,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/I18nContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageToggle from '../components/ui/LanguageToggle';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const { locale } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'metal' | 'infinite'>('metal');

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pwd = form.password;
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  }, [form.password]);

  const strengthLabel = useMemo(() => {
    if (passwordStrength <= 25) return { text: 'Weak', color: '#ef4444' };
    if (passwordStrength <= 50) return { text: 'Fair', color: '#f59e0b' };
    if (passwordStrength <= 75) return { text: 'Good', color: '#3b82f6' };
    return { text: 'Military-Grade Strong', color: '#10b981' };
  }, [passwordStrength]);

  const text =
    locale === 'fr'
      ? {
          openAccount: 'Ouvrir un Compte Numérique',
          heroTitle1: 'Rejoignez la banque',
          heroTitle2: 'du futur.',
          heroDesc:
            'Créez votre compte en 2 minutes : IBAN personnel instantané, cartes virtuelles biométriques et virements SEPA instantanés à zéro frais.',
          tierStandard: 'Standard Numérique',
          tierMetal: 'Black Metal VIP',
          tierInfinite: 'Founder Infinite',
          newAccount: 'Inscription Sécurisée',
          createAccount: 'Créer votre compte',
          joinUsers: 'Rejoignez plus de 2.4 millions de clients satisfaits dans le monde',
          fullName: 'Nom complet',
          emailAddress: 'Adresse e-mail',
          password: 'Mot de passe',
          passwordStrength: 'Force du mot de passe',
          createAccountBtn: 'Ouvrir mon compte FinBank',
          securityNote: 'Vos fonds sont protégés par le standard bancaire européen et le chiffrement AES-256.',
          alreadyHaveAccount: 'Vous possédez déjà un compte ?',
          signIn: 'Se connecter',
        }
      : {
          openAccount: 'Open a Digital Account',
          heroTitle1: 'Join the next era of',
          heroTitle2: 'private banking.',
          heroDesc:
            'Set up in under 2 minutes: instant multi-currency IBANs, biometric virtual cards, and zero-fee instant global settlement.',
          tierStandard: 'Digital Standard',
          tierMetal: 'Black Metal VIP',
          tierInfinite: 'Founder Infinite',
          newAccount: 'Secure Onboarding',
          createAccount: 'Create Your Account',
          joinUsers: 'Join over 2.4 million private clients worldwide',
          fullName: 'Full Legal Name',
          emailAddress: 'Email Address',
          password: 'Create Password',
          passwordStrength: 'Password Security Level',
          createAccountBtn: 'Open My FinBank Account',
          securityNote: 'Protected by 256-bit encryption, continuous audit, and deposit insurance.',
          alreadyHaveAccount: 'Already have an account?',
          signIn: 'Sign in to account',
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
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 10% 20%, rgba(232,97,26,0.14), transparent 45%), radial-gradient(circle at 90% 80%, rgba(59,130,246,0.1), transparent 45%)',
        }}
      />

      {/* ── LEFT SHOWCASE PANEL (Desktop only) ── */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { lg: 5, xl: 7 },
          position: 'relative',
          width: '52%',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        {/* Brand Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px -2px rgba(232, 97, 26, 0.4)',
              }}
            >
              <Sparkles className='w-5 h-5 text-white' />
            </Box>
            <Box>
              <Typography variant='h5' sx={{ fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                FinBank
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700 }}>
                Next-Gen Banking
              </Typography>
            </Box>
          </Stack>

          <Chip
            label='Instant Verification'
            icon={<CheckCircle2 className='w-3.5 h-3.5 text-emerald-500' />}
            variant='outlined'
            sx={{ fontWeight: 700, fontSize: 11 }}
          />
        </Box>

        {/* Hero Headline */}
        <Box sx={{ my: 3 }}>
          <Typography
            variant='caption'
            sx={{
              color: 'primary.main',
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              fontWeight: 800,
              fontSize: 11,
              display: 'block',
              mb: 1,
            }}
          >
            {text.openAccount}
          </Typography>
          <Typography
            variant='h2'
            sx={{
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              fontSize: { lg: '2.5rem', xl: '3.1rem' },
            }}
          >
            {text.heroTitle1}
            <Box component='span' sx={{ color: 'primary.main' }}>
              {' '}
              {text.heroTitle2}
            </Box>
          </Typography>
          <Typography
            variant='body1'
            color='text.secondary'
            sx={{ mt: 1.5, lineHeight: 1.7, fontSize: '0.95rem', maxWidth: 520 }}
          >
            {text.heroDesc}
          </Typography>
        </Box>

        {/* Interactive Tier Selection Preview */}
        <Box sx={{ my: 2 }}>
          <Typography variant='caption' sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', mb: 1.5 }}>
            Select Your Membership Tier
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
            {[
              { id: 'free', name: text.tierStandard, fee: '$0/mo', perks: 'Free IBAN · Virtual Card' },
              { id: 'metal', name: text.tierMetal, fee: '$9/mo', perks: '1% Cashback · Free FX · Black Card', hot: true },
              { id: 'infinite', name: text.tierInfinite, fee: '$25/mo', perks: 'Concierge · VIP Lounge · Uncapped' },
            ].map((plan) => {
              const active = selectedPlan === plan.id;
              return (
                <Card
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id as any)}
                  variant='outlined'
                  sx={{
                    p: 2,
                    borderRadius: 3.5,
                    cursor: 'pointer',
                    bgcolor: active ? 'action.selected' : 'action.hover',
                    border: 2,
                    borderColor: active ? 'primary.main' : 'divider',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    boxShadow: active ? '0 8px 20px -4px rgba(232,97,26,0.2)' : 'none',
                    transform: active ? 'translateY(-2px)' : 'none',
                  }}
                >
                  {plan.hot && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: 12,
                        bgcolor: 'primary.main',
                        color: '#ffffff',
                        px: 1,
                        py: 0.2,
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: 1,
                      }}
                    >
                      POPULAR
                    </Box>
                  )}
                  <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                    {plan.name}
                  </Typography>
                  <Typography variant='h6' sx={{ fontWeight: 900, my: 0.5, color: active ? 'primary.main' : 'text.primary' }}>
                    {plan.fee}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ fontSize: 11, display: 'block' }}>
                    {plan.perks}
                  </Typography>
                </Card>
              );
            })}
          </Box>
        </Box>

        {/* Perks Checklist */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, my: 2 }}>
          {[
            { icon: CreditCard, title: 'Instant Virtual Cards', desc: 'Apple Pay & Google Wallet ready' },
            { icon: Globe, title: 'Zero Foreign Fees', desc: 'Interbank exchange rates on 35+ currencies' },
            { icon: Zap, title: 'Real-time Transfers', desc: 'Microsecond settlement via SEPA & FedWire' },
            { icon: Lock, title: 'Biometric Security', desc: 'Passkeys & 2FA hardware key integration' },
          ].map(({ icon: Icon, title, desc }) => (
            <Box key={title} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2.5,
                  bgcolor: 'action.hover',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  flexShrink: 0,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Icon className='w-4 h-4' />
              </Box>
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 800 }}>
                  {title}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Footer Guarantee */}
        <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldCheck className='w-4 h-4 text-emerald-500 shrink-0' />
            <span>Over $1.8B in volume safely cleared across European and US clearing houses.</span>
          </Typography>
        </Box>
      </Box>

      {/* ── RIGHT REGISTRATION FORM PANEL ── */}
      <Box
        sx={{
          width: { xs: '100%', lg: '48%' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, sm: 4, md: 6 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 5,
            border: 1,
            borderColor: 'divider',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.12)',
            bgcolor: 'background.paper',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
            {/* Top Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Sparkles className='w-4 h-4 text-white' />
                </Box>
                <Typography variant='h6' sx={{ fontWeight: 900 }}>
                  FinBank
                </Typography>
              </Box>

              <Stack direction='row' spacing={1} sx={{ ml: 'auto' }}>
                <LanguageToggle />
                <ThemeToggle />
              </Stack>
            </Box>

            {/* Header */}
            <Stack spacing={0.75} sx={{ mb: 3.5 }}>
              <Typography variant='caption' sx={{ color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800 }}>
                {text.newAccount}
              </Typography>
              <Typography variant='h4' sx={{ fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {text.createAccount}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {text.joinUsers}
              </Typography>
            </Stack>

            {error && (
              <Box sx={{ mb: 2.5, p: 2, borderRadius: 3, bgcolor: 'error.main', color: 'error.contrastText' }}>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  {error}
                </Typography>
              </Box>
            )}

            <Box component='form' onSubmit={handleSubmit}>
              <Stack spacing={2.25}>
                <TextField
                  label={text.fullName}
                  name='name'
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete='name'
                  disabled={loading}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <User className='h-4 w-4 text-slate-400' />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label={text.emailAddress}
                  name='email'
                  type='email'
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete='email'
                  disabled={loading}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Mail className='h-4 w-4 text-slate-400' />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Box>
                  <TextField
                    label={text.password}
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    required
                    fullWidth
                    autoComplete='new-password'
                    disabled={loading}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position='end'>
                            <Button
                              type='button'
                              onClick={() => setShowPassword((v) => !v)}
                              disabled={loading}
                              sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}
                              aria-label='Toggle password visibility'
                            >
                              {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                            </Button>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  {/* Password Strength Indicator */}
                  {form.password && (
                    <Box sx={{ mt: 1, px: 0.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant='caption' sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
                          {text.passwordStrength}:
                        </Typography>
                        <Typography variant='caption' sx={{ fontSize: 11, fontWeight: 800, color: strengthLabel.color }}>
                          {strengthLabel.text}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={passwordStrength}
                        sx={{
                          height: 6,
                          borderRadius: 999,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: strengthLabel.color,
                            borderRadius: 999,
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>

                <Button
                  type='submit'
                  variant='contained'
                  size='large'
                  disabled={loading || !form.email || !form.password || !form.name}
                  endIcon={loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <ArrowRight className='h-4 w-4' />}
                  sx={{
                    py: 1.6,
                    fontSize: 15,
                    fontWeight: 800,
                    mt: 1,
                  }}
                >
                  {text.createAccountBtn}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Security note */}
            <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldCheck className='w-4 h-4 text-emerald-500 shrink-0' />
              <span>{text.securityNote}</span>
            </Typography>

            {/* Sign in link */}
            <Typography variant='body2' sx={{ mt: 2.5, textAlign: 'center' }}>
              {text.alreadyHaveAccount}{' '}
              <Box
                component={Link}
                to='/login'
                sx={{ color: 'primary.main', fontWeight: 800, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {text.signIn}
              </Box>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
