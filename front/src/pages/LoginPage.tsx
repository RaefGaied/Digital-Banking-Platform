import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  TrendingUp,
  Activity,
  Globe2,
  Lock,
  RotateCw,
  Zap,
  CheckCircle2,
  Wifi,
  Landmark,
  Bot,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import TwoFactorModal from '../components/auth/TwoFactorModal';
import { useI18n } from '../i18n/context';
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
  const [searchParams] = useSearchParams();
  const { login, loading, error, lockedUntil, attemptsRemaining, verify2fa } = useAuth();
  const { locale } = useI18n();
  const [show2fa, setShow2fa] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(0);

  // Interactive Live Data States
  const [fxList, setFxList] = useState(initialFx);
  const [activeTab, setActiveTab] = useState<'agent' | 'security' | 'live' | 'fx'>('agent');
  const [feedIndex, setFeedIndex] = useState(0);
  const [agentScenarioIndex, setAgentScenarioIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const agentScenarios = locale === 'fr' ? [
    {
      category: 'Virement Intelligent',
      clientQuery: '« Exécute un virement de 350 € vers mon compte épargne »',
      agentReply: 'Virement SEPA instantané exécuté sans frais. Nouveau solde disponible : 14 820,50 €.',
      latency: '14ms',
      icon: Zap,
      accent: '#e8611a',
    },
    {
      category: 'Gestion de Carte & Sécurité',
      clientQuery: '« Augmente temporairement le plafond de ma carte FinBank Black »',
      agentReply: 'Plafond rehaussé à 5 000 € pour 48h après validation de votre empreinte biométrique.',
      latency: '9ms',
      icon: ShieldCheck,
      accent: '#10b981',
    },
    {
      category: 'Analyse Budgétaire Prédictive',
      clientQuery: '« Quelle est ma projection de dépenses d’ici la fin du mois ? »',
      agentReply: 'Synthèse générée : vous restez dans vos objectifs (+14% d’épargne prévisionnelle).',
      latency: '18ms',
      icon: TrendingUp,
      accent: '#6366f1',
    },
  ] : [
    {
      category: 'Instant Transfer',
      clientQuery: '“Transfer $350 to my high-yield savings account”',
      agentReply: 'SEPA Instant completed with zero fees. Updated account balance: $14,820.50.',
      latency: '14ms',
      icon: Zap,
      accent: '#e8611a',
    },
    {
      category: 'Card Control & Security',
      clientQuery: '“Temporarily increase my FinBank Black spending limit”',
      agentReply: 'Card limit elevated to $5,000 for 48 hours after biometric authentication.',
      latency: '9ms',
      icon: ShieldCheck,
      accent: '#10b981',
    },
    {
      category: 'Predictive Financial Insights',
      clientQuery: '“What is my projected expenditure for the rest of this month?”',
      agentReply: 'Insights ready: your budget remains well on target (+14% projected savings).',
      latency: '18ms',
      icon: TrendingUp,
      accent: '#6366f1',
    },
  ];

  // Periodic simulated live ticks & dynamic cycling
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

    const agentInterval = window.setInterval(() => {
      setAgentScenarioIndex((prev) => (prev + 1) % agentScenarios.length);
    }, 4200);

    return () => {
      window.clearInterval(fxInterval);
      window.clearInterval(feedInterval);
      window.clearInterval(agentInterval);
    };
  }, [agentScenarios.length]);

  // Account Lock Countdown Timer
  useEffect(() => {
    if (!lockedUntil) {
      return;
    }
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
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

  const text =
    locale === 'fr'
      ? {
          brandName: 'FinBank',
          brandSubtitle: 'Banque Digitale & Agent Intelligent',
          platformTag: 'Portail Client Privé • Sécurité Institutionnelle',
          privateBanking: 'Banque Privée & Agent Dédié',
          heroTitle1: 'Votre Banque Digitale,',
          heroTitle2: 'propulsée par un Agent 24/7.',
          heroDesc:
            'Gérez vos comptes en temps réel, exécutez vos opérations financières en langage naturel et bénéficiez d’un accompagnement bancaire permanent.',
          agentConcierge: 'Agent Bancaire 24/7',
          liveStream: 'Flux Réseau',
          fxMarkets: 'Marchés FX',
          securityAudit: 'Sécurité & Garanties',
          systemOnline: 'AGENT EN LIGNE • ACTIF 24/7',
          agentActivePrompt: 'Agent Bancaire Intelligent Actif',
          agentActiveDesc: 'Votre assistant dédié est prêt pour vos virements et analyses dès votre connexion.',
          welcomeBack: 'Espace Client Sécurisé',
          welcomeSubtitle: 'Authentification Forte',
          signInPrompt: 'Identifiez-vous pour accéder à vos comptes et interagir avec votre agent.',
          emailAddress: 'Adresse e-mail',
          password: 'Mot de passe',
          forgotPassword: 'Mot de passe oublié ?',
          signIn: 'Accéder à mon espace',
          securityNote: 'Connexion chiffrée SSL/TLS · Chiffrement AES-256 · Conforme DSP2',
          noAccount: 'Pas encore de compte ?',
          createOne: 'Ouvrir un compte bancaire',
          flipCard: 'Retourner la carte (CVV)',
        }
      : {
          brandName: 'FinBank',
          brandSubtitle: 'Digital Banking & Smart Agent',
          platformTag: 'Private Client Portal • Enterprise Security',
          privateBanking: 'Private Banking & Dedicated Agent',
          heroTitle1: 'Next-Gen Banking,',
          heroTitle2: 'guided by 24/7 Smart Agent.',
          heroDesc:
            'Effortlessly manage multi-currency accounts, execute transactions through conversation, and enjoy continuous private banking assistance.',
          agentConcierge: '24/7 Smart Agent',
          liveStream: 'Network Feed',
          fxMarkets: 'FX Markets',
          securityAudit: 'Security & Compliance',
          systemOnline: 'AGENT ONLINE • ACTIVE 24/7',
          agentActivePrompt: 'Intelligent Banking Agent Active',
          agentActiveDesc: 'Your dedicated financial assistant is ready for your transfers and insights.',
          welcomeBack: 'Secure Client Portal',
          welcomeSubtitle: 'Multi-Factor Access',
          signInPrompt: 'Authenticate to access your funds and interact with your financial agent.',
          emailAddress: 'Email Address',
          password: 'Password',
          forgotPassword: 'Forgot password?',
          signIn: 'Access My Account',
          securityNote: 'SSL/TLS Encrypted · AES-256 Bit Security · PSD2 Banking Standard Compliant',
          noAccount: "Don't have an account yet?",
          createOne: 'Open a bank account',
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

  const currentScenario = agentScenarios[agentScenarioIndex];

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
            'radial-gradient(circle at 12% 18%, rgba(232,97,26,0.18), transparent 45%), radial-gradient(circle at 88% 82%, rgba(99,102,241,0.14), transparent 45%)',
        }}
      />

      {/* ── LEFT SHOWCASE PANEL (Desktop only, Banking Portal Brand Hub) ── */}
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
                width: 48,
                height: 48,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px -2px rgba(232, 97, 26, 0.4)',
              }}
            >
              <Landmark className='w-6 h-6 text-white' />
            </Box>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {text.brandName}
              </Typography>
              <Typography
                variant='caption'
                color='primary.main'
                sx={{ letterSpacing: 0.5, fontWeight: 800, display: 'block' }}
              >
                {text.brandSubtitle}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ fontSize: 10, fontWeight: 600, display: 'block', mt: 0.2 }}
              >
                {text.platformTag}
              </Typography>
            </Box>
          </Stack>

          {/* Dynamic Live Agent Pulse Status Badge */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 0.8,
              borderRadius: 999,
              bgcolor: 'action.hover',
              border: 1,
              borderColor: 'rgba(232,97,26,0.3)',
              boxShadow: '0 4px 16px -2px rgba(232, 97, 26, 0.15)',
            }}
          >
            <Box
              className='ai-halo-orbit'
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#0f172a',
              }}
            >
              <Bot className='w-3.5 h-3.5 text-orange-400' />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box className='ai-wave-bar' sx={{ height: '9px !important' }} />
              <Box className='ai-wave-bar' sx={{ height: '15px !important' }} />
              <Box className='ai-wave-bar' sx={{ height: '11px !important' }} />
              <Box className='ai-wave-bar' sx={{ height: '16px !important' }} />
            </Box>
            <Typography variant='caption' sx={{ fontWeight: 900, color: 'text.primary', fontSize: 11, letterSpacing: 0.5 }}>
              {text.systemOnline}
            </Typography>
          </Box>
        </Box>

        {/* Hero Copy */}
        <Box sx={{ my: 3 }}>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <Sparkles className='w-3.5 h-3.5 text-orange-500' />
            <Typography
              variant='caption'
              sx={{
                color: 'primary.main',
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                fontWeight: 900,
                fontSize: 11,
              }}
            >
              {text.privateBanking}
            </Typography>
          </Stack>
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

        {/* ── REALISTIC DYNAMIC BANKING & AGENT TABS ── */}
        <Box sx={{ mt: 1 }}>
          {/* Tab Navigation */}
          <Stack direction='row' spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 0.5 }}>
            {[
              { key: 'agent', label: text.agentConcierge, icon: Bot },
              { key: 'security', label: text.securityAudit, icon: Lock },
              { key: 'live', label: text.liveStream, icon: Activity },
              { key: 'fx', label: text.fxMarkets, icon: TrendingUp },
            ].map(({ key, label, icon: Icon }) => {
              const isSelected = activeTab === key;
              return (
                <Button
                  key={key}
                  size='small'
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  startIcon={<Icon className='w-3.5 h-3.5' />}
                  sx={{
                    borderRadius: 3,
                    py: 0.7,
                    px: 1.8,
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
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

          {/* TAB 0: Dynamic 24/7 Agent Concierge Preview */}
          {activeTab === 'agent' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Dynamic Interactive Agent Simulation Box */}
              <Card
                variant='outlined'
                className='cyber-shimmer'
                sx={{
                  p: 2.2,
                  borderRadius: 3.5,
                  bgcolor: 'action.hover',
                  border: 1,
                  borderColor: 'rgba(232, 97, 26, 0.35)',
                  boxShadow: '0 10px 25px -5px rgba(232, 97, 26, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header with Live Status & Audio/Equalizer Animation */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.8 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                      className='ai-halo-orbit'
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: '#0f172a',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Bot className='w-3.5 h-3.5 text-orange-400' />
                    </Box>
                    <Box>
                      <Typography variant='subtitle2' sx={{ fontWeight: 800, fontSize: 13, color: 'text.primary' }}>
                        {currentScenario.category}
                      </Typography>
                      <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: 10 }}>
                        {locale === 'fr' ? 'Interaction en direct · Réponse en temps réel' : 'Live interaction · Real-time processing'}
                      </Typography>
                    </Box>
                  </Box>

                  <Chip
                    label={`Latence: ${currentScenario.latency}`}
                    size='small'
                    color='success'
                    variant='outlined'
                    sx={{ height: 20, fontSize: 10, fontWeight: 800 }}
                  />
                </Box>

                {/* Client Voice / Message Bubble */}
                <Box
                  sx={{
                    p: 1.4,
                    borderRadius: 2.5,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    mb: 1.2,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.2,
                  }}
                >
                  <MessageSquare className='w-4 h-4 text-slate-400 mt-0.5 shrink-0' />
                  <Typography variant='body2' sx={{ fontWeight: 700, color: 'text.primary', fontSize: 12.5, fontStyle: 'italic' }}>
                    {currentScenario.clientQuery}
                  </Typography>
                </Box>

                {/* Agent Instant Resolution Bubble */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(232, 97, 26, 0.08)',
                    border: 1,
                    borderColor: 'rgba(232, 97, 26, 0.25)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.2,
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'grid',
                      placeItems: 'center',
                      shrink: 0,
                      color: '#ffffff',
                    }}
                  >
                    <Zap className='w-3 h-3' />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='caption' sx={{ color: 'primary.main', fontWeight: 900, textTransform: 'uppercase', fontSize: 10, display: 'block', mb: 0.2 }}>
                      Agent FinBank
                    </Typography>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12, lineHeight: 1.5 }}>
                      {currentScenario.agentReply}
                    </Typography>
                  </Box>
                </Box>

                {/* Pagination / scenario selector chips */}
                <Stack direction='row' spacing={1} sx={{ mt: 1.6, justifyContent: 'center' }}>
                  {agentScenarios.map((sc, idx) => (
                    <Box
                      key={sc.category}
                      onClick={() => setAgentScenarioIndex(idx)}
                      sx={{
                        width: idx === agentScenarioIndex ? 26 : 8,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: idx === agentScenarioIndex ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': { bgcolor: 'primary.light' },
                      }}
                    />
                  ))}
                </Stack>
              </Card>

              {/* 3 Quick Capability Pillars */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                {[
                  { title: locale === 'fr' ? 'Exécution Rapide' : 'Instant Action', desc: locale === 'fr' ? 'SEPA Instant & Ordres' : 'Instant transfers & ops', icon: Zap },
                  { title: locale === 'fr' ? 'Contrôle Biométrique' : 'Biometric Auth', desc: locale === 'fr' ? 'Plafonds & Sécurité' : 'Limits & Card safety', icon: ShieldCheck },
                  { title: locale === 'fr' ? 'Analyse Budgétaire' : 'Smart Insights', desc: locale === 'fr' ? 'Vision patrimoniale' : 'Wealth projections', icon: TrendingUp },
                ].map(({ title, desc, icon: Icon }) => (
                  <Box
                    key={title}
                    sx={{
                      p: 1.2,
                      borderRadius: 2.5,
                      bgcolor: 'action.hover',
                      border: 1,
                      borderColor: 'divider',
                      textAlign: 'center',
                    }}
                  >
                    <Icon className='w-3.5 h-3.5 text-orange-500 mx-auto mb-0.5' />
                    <Typography variant='caption' sx={{ fontWeight: 800, color: 'text.primary', fontSize: 11, display: 'block' }}>
                      {title}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: 9.5 }}>
                      {desc}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* TAB 1: Security & Reserves Audit */}
          {activeTab === 'security' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {[
                {
                  title: locale === 'fr' ? '100% Fonds Sécurisés' : '100% Full Reserve',
                  desc: locale === 'fr' ? 'Comptes ségrégués et réserves garanties' : 'Real-time segregated vaults & proof',
                  icon: ShieldCheck,
                },
                {
                  title: locale === 'fr' ? 'Ratio Tier 1 : 18.4%' : 'Tier 1 Capital: 18.4%',
                  desc: locale === 'fr' ? 'Dépasse les exigences Bâle III' : 'Exceeds Basel III Requirements',
                  icon: CheckCircle2,
                },
                {
                  title: 'Certification SOC-2',
                  desc: locale === 'fr' ? 'Architecture Zero-Trust & Chiffrement E2E' : 'Zero-Trust Architecture Certified',
                  icon: Lock,
                },
                {
                  title: locale === 'fr' ? 'Garantie des Dépôts' : 'Deposit Guarantee',
                  desc: locale === 'fr' ? 'Protection européenne jusqu’à 100 000 €' : 'Protected by European Directives',
                  icon: Globe2,
                },
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

          {/* TAB 2: Live Settlements Feed */}
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

          {/* TAB 3: Live FX Markets Ticker */}
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
                  <Landmark className='w-4 h-4 text-white' />
                </Box>
                <Typography variant='subtitle1' sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  {text.brandName}
                </Typography>
              </Box>

              <Stack direction='row' spacing={1} sx={{ ml: 'auto' }}>
                <LanguageToggle />
                <ThemeToggle />
              </Stack>
            </Box>

            {/* Dynamic Agent Vibe Presence Pill */}
            <Box
              sx={{
                mb: 3,
                p: 1.6,
                borderRadius: 3.5,
                background: 'linear-gradient(135deg, rgba(232, 97, 26, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                border: 1,
                borderColor: 'rgba(232, 97, 26, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.6,
              }}
            >
              <Box
                className='ai-halo-orbit'
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  bgcolor: '#0f172a',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Bot className='w-4 h-4 text-orange-400' />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 800, fontSize: 12.5, color: 'text.primary', lineHeight: 1.2 }}>
                    {text.agentActivePrompt}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <Box className='ai-wave-bar' sx={{ height: '8px !important' }} />
                    <Box className='ai-wave-bar' sx={{ height: '13px !important' }} />
                    <Box className='ai-wave-bar' sx={{ height: '9px !important' }} />
                  </Box>
                </Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: 10.5, display: 'block', mt: 0.2 }}>
                  {text.agentActiveDesc}
                </Typography>
              </Box>
            </Box>

            {/* Title & Prompt */}
            <Stack spacing={0.75} sx={{ mb: 3.5 }}>
              <Typography variant='h4' sx={{ fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                {text.welcomeBack}
              </Typography>
              <Typography variant='caption' color='primary.main' sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                {text.welcomeSubtitle}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {text.signInPrompt}
              </Typography>
            </Stack>

            {/* Account Locked Warning */}
            {searchParams.get('email-updated') === '1' && (
              <Box sx={{ mb: 2.5, p: 2, borderRadius: 3, bgcolor: 'success.main', color: 'success.contrastText' }}>
                <Typography variant='body2' sx={{ fontWeight: 700 }}>
                  {locale === 'fr'
                    ? 'Votre adresse e-mail a été modifiée. Connectez-vous avec votre nouvelle adresse.'
                    : 'Your email address was updated. Sign in using your new email address.'}
                </Typography>
              </Box>
            )}

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

                <Box
                  component={Link}
                  to='/forgot-password'
                  sx={{ alignSelf: 'flex-end', color: 'primary.main', fontSize: 14, fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {text.forgotPassword}
                </Box>

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
