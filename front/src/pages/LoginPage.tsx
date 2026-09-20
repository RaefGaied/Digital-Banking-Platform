import { useEffect, useState, useRef } from 'react';
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
} from '@mui/material';
import {
  ArrowRight,
  Loader2,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  Activity,
  Globe2,
  Lock,
  RotateCw,
  Zap,
  CheckCircle2,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import TwoFactorModal from '../components/auth/TwoFactorModal';
import { useI18n } from '../i18n/I18nContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageToggle from '../components/ui/LanguageToggle';

const initialFx = [
  { pair: 'EUR / USD', rate: 1.0848, change: '+0.34%', up: true },
  { pair: 'GBP / USD', rate: 1.2915, change: '+0.21%', up: true },
  { pair: 'USD / CHF', rate: 0.8924, change: '-0.12%', up: false },
  { pair: 'BTC / USD', rate: 67420, change: '+2.85%', up: true },
];

const liveSettlements = [
  { type: 'SEPA Instant', location: 'Frankfurt Hub', latency: '11ms', amount: '€18,400.00', status: 'Cleared' },
  { type: 'FedWire Realtime', location: 'New York Gateway', latency: '19ms', amount: '$142,500.00', status: 'Cleared' },
  { type: 'Biometric Shield', location: 'Zurich Vault', latency: '8ms', amount: '2FA Confirmed', status: 'Secured' },
  { type: 'SWIFT gpi Multi-Currency', location: 'Singapore Hub', latency: '26ms', amount: '$74,250.00', status: 'Cleared' },
  { type: 'Target2 Gross Settlement', location: 'Paris Clearing', latency: '14ms', amount: '€95,100.00', status: 'Cleared' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, lockedUntil, attemptsRemaining, verify2fa } = useAuth();
  const { locale } = useI18n();
  const [show2fa, setShow2fa] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Interactive Live Data States
  const [fxList, setFxList] = useState(initialFx);
  const [activeTab, setActiveTab] = useState<'live' | 'fx' | 'security'>('live');
  const [feedIndex, setFeedIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Periodic simulated live ticks for real-time market authenticity
  useEffect(() => {
    const fxInterval = window.setInterval(() => {
      setFxList((prev) =>
        prev.map((item) => {
          const delta = (Math.random() - 0.48) * (item.pair.includes('BTC') ? 15 : 0.0004);
          const nextRate = item.pair.includes('BTC')
            ? Math.round(item.rate + delta)
            : Number((item.rate + delta).toFixed(4));
          const isUp = delta >= 0;
          return {
            ...item,
            rate: nextRate,
            change: `${isUp ? '+' : ''}${(Math.random() * 0.4 + 0.1).toFixed(2)}%`,
            up: isUp,
          };
        })
      );
    }, 2800);

    const feedInterval = window.setInterval(() => {
      setFeedIndex((prev) => (prev + 1) % liveSettlements.length);
    }, 3200);

    return () => {
      window.clearInterval(fxInterval);
      window.clearInterval(feedInterval);
    };
  }, []);

  // Account Lock Countdown Timer
  useEffect(() => {
    if (!lockedUntil) {
      setNow(Date.now());
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const lockExpiry = lockedUntil ? new Date(lockedUntil).getTime() : null;
  const lockRemainingMs = lockExpiry ? Math.max(lockExpiry - now, 0) : 0;
  const isAccountLocked = lockRemainingMs > 0;
  const formatLockCountdown = () => {
    const totalSeconds = Math.ceil(lockRemainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    return `${seconds}s`;
  };

  // Card mouse movement for dynamic 3D glare
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const fillDemo = (role: 'user' | 'admin') => {
    if (role === 'admin') {
      setEmail('admin@banking.com');
      setPassword('Admin123!');
    } else {
      setEmail('user@banking.com');
      setPassword('User123!');
    }
  };

  const text =
    locale === 'fr'
      ? {
          privateBanking: 'Banque Privée Nouvelle Génération',
          heroTitle1: 'Votre argent,',
          heroTitle2: 'vos règles.',
          heroDesc:
            'Terminal financier haute performance : exécution instantanée, coffres multi-devises et sécurité biométrique de grade militaire.',
          liveStream: 'Flux Réseau en Direct',
          fxMarkets: 'Marchés Devises / FX',
          securityAudit: 'Réserves & Sécurité',
          instantClearing: 'Règlement Réseau',
          secureAccess: 'Portail Sécurisé FinBank',
          welcomeBack: 'Accès Client Sécurisé',
          signInPrompt: 'Identifiez-vous pour gérer vos actifs et autoriser vos transactions',
          emailAddress: 'Adresse e-mail',
          password: 'Mot de passe',
          forgotPassword: 'Mot de passe oublié ?',
          signIn: 'Connexion Sécurisée',
          securityNote: 'Chiffrement AES 256 bits · Garanties de dépôts certifiées · Audit continu',
          noAccount: 'Pas encore de compte ?',
          createOne: 'Ouvrir un compte',
          demoClient: 'Démo Client',
          demoAdmin: 'Démo Admin',
          flipCard: 'Retourner la carte',
        }
      : {
          privateBanking: 'Next-Gen Private Banking Terminal',
          heroTitle1: 'Your wealth,',
          heroTitle2: 'your control.',
          heroDesc:
            'Institutional-grade digital banking: microsecond transaction clearing, multi-currency vaults, and zero-trust biometric security.',
          liveStream: 'Live Network Feed',
          fxMarkets: 'Live FX Treasury',
          securityAudit: 'Reserves & Proof',
          instantClearing: 'Global Settlement',
          secureAccess: 'FinBank Secure Portal',
          welcomeBack: 'Client Terminal Access',
          signInPrompt: 'Authenticate to access your portfolios, vaults, and private transfers',
          emailAddress: 'Email Address',
          password: 'Password',
          forgotPassword: 'Forgot password?',
          signIn: 'Authenticate & Access',
          securityNote: 'AES-256 GCM Encryption · 100% Reserve Audited · Multi-region failover',
          noAccount: "Don't have an account yet?",
          createOne: 'Open an account',
          demoClient: 'Demo Client',
          demoAdmin: 'Demo Admin',
          flipCard: 'Flip Card (CVV)',
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
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic ambient gradient background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 12% 18%, rgba(232,97,26,0.14), transparent 45%), radial-gradient(circle at 88% 82%, rgba(59,130,246,0.1), transparent 45%)',
        }}
      />

      {/* ── LEFT SHOWCASE PANEL (Desktop only, Interactive Real-time Banking Hub) ── */}
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
        {/* Brand Header & Live Network Status Indicator */}
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
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700 }}
              >
                Institutional & Private Banking
              </Typography>
            </Box>
          </Stack>

          {/* Live Ping & Node Status Badge */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 0.8,
              borderRadius: 999,
              bgcolor: 'action.hover',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Box className='w-2 h-2 rounded-full bg-emerald-500 status-pulse-emerald' />
            <Typography variant='caption' sx={{ fontWeight: 800, color: 'text.primary', fontSize: 11 }}>
              LIVE NETWORK • 99.999% SLA
            </Typography>
          </Box>
        </Box>

        {/* Hero Copy */}
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
            {text.privateBanking}
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

        {/* ── INTERACTIVE 3D HOLOGRAPHIC CARD ── */}
        <Box sx={{ my: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => setCardFlipped(!cardFlipped)}
            className='perspective-1000'
            sx={{
              width: '100%',
              maxWidth: 420,
              height: 230,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.15s ease-out',
            }}
          >
            <Box
              className={`transform-style-3d relative w-full h-full rounded-3xl transition-transform duration-700 shadow-2xl ${
                cardFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transform: cardFlipped
                  ? 'rotateY(180deg)'
                  : `perspective(1000px) rotateX(${-mousePos.y * 14}deg) rotateY(${mousePos.x * 14}deg)`,
              }}
            >
              {/* Card Front */}
              <Box
                className='backface-hidden absolute inset-0 rounded-3xl p-6 flex flex-col justify-between overflow-hidden border border-white/20'
                sx={{
                  background: 'linear-gradient(135deg, #0d0f14 0%, #1a1e29 55%, #11141c 100%)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                }}
              >
                {/* Holographic Iridescent Sheen Layer */}
                <Box className='holographic-sheen absolute inset-0 pointer-events-none opacity-40' />

                {/* Card Top Row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                  <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 28,
                        borderRadius: 1.5,
                        background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 60%, #b45309 100%)',
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
                        border: '1px solid rgba(0,0,0,0.3)',
                      }}
                    />
                    <Wifi className='w-5 h-5 text-slate-400 rotate-90' />
                  </Stack>
                  <Typography variant='caption' sx={{ letterSpacing: 2, fontWeight: 900, color: '#f8fafc' }}>
                    FINBANK BLACK
                  </Typography>
                </Box>

                {/* Card Number */}
                <Box sx={{ zIndex: 2, my: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '1.28rem',
                      letterSpacing: '0.22em',
                      color: '#ffffff',
                      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                    }}
                  >
                    4829 •••• •••• 8842
                  </Typography>
                </Box>

                {/* Card Bottom Row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 2 }}>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block', textTransform: 'uppercase' }}>
                      Cardholder
                    </Typography>
                    <Typography variant='body2' sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: 1 }}>
                      VIP PRIVATE CLIENT
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>
                      EXPIRES
                    </Typography>
                    <Typography variant='body2' sx={{ fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                      09/29
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Card Back */}
              <Box
                className='backface-hidden rotate-y-180 absolute inset-0 rounded-3xl p-6 flex flex-col justify-between overflow-hidden border border-white/20'
                sx={{
                  background: 'linear-gradient(135deg, #11141c 0%, #1a1e29 55%, #0d0f14 100%)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                }}
              >
                {/* Magnetic Strip */}
                <Box sx={{ mx: -6, mt: 1, height: 42, bgcolor: '#000000' }} />

                {/* Security CVV Strip */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                  <Box sx={{ flex: 1, height: 32, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, color: '#09090b', letterSpacing: 2 }}>
                      842
                    </Typography>
                  </Box>
                  <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                    CVV2
                  </Typography>
                </Box>

                <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, lineHeight: 1.4 }}>
                  Institutional FinBank Card. 24/7 Global Priority Hotline: +1 (800) 888-BANK. Member FDIC.
                </Typography>
              </Box>
            </Box>
          </Box>
          <Button
            size='small'
            variant='text'
            onClick={() => setCardFlipped(!cardFlipped)}
            startIcon={<RotateCw className='w-3.5 h-3.5' />}
            sx={{ mt: 1, textTransform: 'none', color: 'text.secondary', fontSize: 12 }}
          >
            {text.flipCard}
          </Button>
        </Box>

        {/* ── REALISTIC LIVE STATISTICS INTERACTIVE TABS ── */}
        <Box sx={{ mt: 1 }}>
          {/* Tab Navigation */}
          <Stack direction='row' spacing={1} sx={{ mb: 2 }}>
            {[
              { key: 'live', label: text.liveStream, icon: Activity },
              { key: 'fx', label: text.fxMarkets, icon: TrendingUp },
              { key: 'security', label: text.securityAudit, icon: Lock },
            ].map(({ key, label, icon: Icon }) => {
              const isSelected = activeTab === key;
              return (
                <Button
                  key={key}
                  size='small'
                  onClick={() => setActiveTab(key as any)}
                  startIcon={<Icon className='w-3.5 h-3.5' />}
                  sx={{
                    borderRadius: 3,
                    py: 0.7,
                    px: 1.8,
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: 'none',
                    bgcolor: isSelected ? 'primary.main' : 'action.hover',
                    color: isSelected ? 'primary.contrastText' : 'text.secondary',
                    '&:hover': {
                      bgcolor: isSelected ? 'primary.dark' : 'action.selected',
                    },
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Stack>

          {/* TAB 1: Live Settlements Feed */}
          {activeTab === 'live' && (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {liveSettlements.map((item, index) => {
                const isCurrent = index === feedIndex;
                return (
                  <Box
                    key={item.type}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.6,
                      borderRadius: 3,
                      bgcolor: isCurrent ? 'action.selected' : 'action.hover',
                      border: 1,
                      borderColor: isCurrent ? 'primary.main' : 'divider',
                      transition: 'all 0.3s ease',
                      boxShadow: isCurrent ? '0 4px 14px -2px rgba(232,97,26,0.15)' : 'none',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          bgcolor: isCurrent ? 'primary.main' : 'background.paper',
                          color: isCurrent ? 'primary.contrastText' : 'text.primary',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Zap className='w-4 h-4' />
                      </Box>
                      <Box>
                        <Typography variant='body2' sx={{ fontWeight: 800, color: 'text.primary' }}>
                          {item.type}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {item.location} • Latency: {item.latency}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='body2' sx={{ fontWeight: 800, color: 'text.primary', fontFamily: 'monospace' }}>
                        {item.amount}
                      </Typography>
                      <Chip label={item.status} size='small' color='success' variant='outlined' sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* TAB 2: Live FX Markets Ticker */}
          {activeTab === 'fx' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {fxList.map((item) => (
                <Card
                  key={item.pair}
                  variant='outlined'
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant='caption' sx={{ fontWeight: 800, color: 'text.secondary' }}>
                      {item.pair}
                    </Typography>
                    <Chip
                      label={item.change}
                      size='small'
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 800,
                        bgcolor: item.up ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: item.up ? '#10b981' : '#ef4444',
                      }}
                    />
                  </Box>
                  <Typography variant='h6' sx={{ fontWeight: 900, mt: 0.5, fontFamily: 'monospace' }}>
                    {typeof item.rate === 'number' && item.rate > 1000
                      ? `$${item.rate.toLocaleString()}`
                      : item.rate.toFixed(4)}
                  </Typography>
                </Card>
              ))}
            </Box>
          )}

          {/* TAB 3: Security & Reserves Audit */}
          {activeTab === 'security' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {[
                { title: '100% Full Reserve', desc: 'Real-time On-Chain & Bank Proof', icon: ShieldCheck },
                { title: 'Tier 1 Capital: 18.4%', desc: 'Exceeds Basel III Requirements', icon: CheckCircle2 },
                { title: 'SOC-2 Type II', desc: 'Zero-Trust Architecture Certified', icon: Lock },
                { title: '$250k Insurance', desc: 'Protected by European Directives', icon: Globe2 },
              ].map(({ title, desc, icon: Icon }) => (
                <Card
                  key={title}
                  variant='outlined'
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Icon className='w-5 h-5 text-emerald-500 mb-1' />
                  <Typography variant='subtitle2' sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {title}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {desc}
                  </Typography>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* ── RIGHT LOGIN FORM PANEL ── */}
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
            {/* Top Toolbar: Brand & Toggles */}
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

            {/* Quick Demo Fill Buttons for Easy Evaluation */}
            <Box
              sx={{
                mb: 3,
                p: 1.5,
                borderRadius: 3,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant='caption' sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                1-Click Testing:
              </Typography>
              <Stack direction='row' spacing={1}>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => fillDemo('user')}
                  startIcon={<Zap className='w-3 h-3 text-orange-500' />}
                  sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, py: 0.4 }}
                >
                  {text.demoClient}
                </Button>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => fillDemo('admin')}
                  startIcon={<ShieldCheck className='w-3 h-3 text-emerald-500' />}
                  sx={{ borderRadius: 2, fontSize: 11, fontWeight: 700, py: 0.4 }}
                >
                  {text.demoAdmin}
                </Button>
              </Stack>
            </Box>

            {/* Title & Prompt */}
            <Stack spacing={0.75} sx={{ mb: 3.5 }}>
              <Typography variant='caption' sx={{ color: 'primary.main', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800 }}>
                {text.secureAccess}
              </Typography>
              <Typography variant='h4' sx={{ fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {text.welcomeBack}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {text.signInPrompt}
              </Typography>
            </Stack>

            {/* Account Locked Warning */}
            {lockedUntil && (
              <Box sx={{ mb: 2.5, p: 2, borderRadius: 3, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                <Typography variant='body2' sx={{ fontWeight: 700 }}>
                  Account temporarily locked. Try again in {formatLockCountdown()}.
                </Typography>
              </Box>
            )}

            {/* Error Notification */}
            {error && (
              <Box sx={{ mb: 2.5, p: 2, borderRadius: 3, bgcolor: 'error.main', color: 'error.contrastText' }}>
                <Stack spacing={0.5}>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {error}
                  </Typography>
                  {!lockedUntil && typeof attemptsRemaining === 'number' && attemptsRemaining > 0 && (
                    <Typography variant='caption' sx={{ opacity: 0.9 }}>
                      {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} left before account lock.
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            {/* Form */}
            <Box component='form' onSubmit={handleSubmit}>
              <Stack spacing={2.25}>
                <TextField
                  label={text.emailAddress}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type='email'
                  autoComplete='username'
                  disabled={loading || isAccountLocked}
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

                <TextField
                  label={text.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                  disabled={loading || isAccountLocked}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <Button
                            type='button'
                            onClick={() => setShowPassword((v) => !v)}
                            disabled={loading || isAccountLocked}
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

                <Button
                  type='submit'
                  variant='contained'
                  size='large'
                  disabled={loading || isAccountLocked}
                  endIcon={loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <ArrowRight className='h-4 w-4' />}
                  sx={{
                    py: 1.6,
                    fontSize: 15,
                    fontWeight: 800,
                    mt: 1,
                  }}
                >
                  {text.signIn}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Security footnote */}
            <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldCheck className='w-4 h-4 text-emerald-500 shrink-0' />
              <span>{text.securityNote}</span>
            </Typography>

            {/* Register Link */}
            <Typography variant='body2' sx={{ mt: 2.5, textAlign: 'center' }}>
              {text.noAccount}{' '}
              <Box
                component={Link}
                to='/register'
                sx={{ color: 'primary.main', fontWeight: 800, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
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
