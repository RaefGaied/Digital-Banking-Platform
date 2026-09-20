import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Copy,
  Send,
  Download,
  CreditCard,
  Zap,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  Wifi,
  ShieldCheck,
  Check,
  CheckCircle2,
  X,
  Lock,
  Unlock,
} from 'lucide-react';
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { accountApi } from '../api/account';
import { cardsApi } from '../api/cards';
import { investmentsApi } from '../api/investments';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';

type SpendingFilter = 'week' | 'month' | 'all';
type SpendingType = 'all' | 'WITHDRAWAL' | 'TRANSFER' | 'DEPOSIT';

type QuickAction = {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  action: () => void;
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  bg,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent: string;
  bg: string;
}) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 24px -6px rgba(0,0,0,0.08)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant='caption'
              sx={{
                color: 'text.secondary',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                fontWeight: 700,
                fontSize: '0.7rem',
              }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                mt: 0.75,
                fontWeight: 800,
                fontSize: { xs: '1.4rem', sm: '1.65rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}
            >
              {value}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75, fontSize: '0.8rem' }} noWrap>
              {sub}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              bgcolor: bg,
              color: accent,
              flexShrink: 0,
            }}
          >
            <Icon className='h-5 w-5' />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [spendingFilter, setSpendingFilter] = useState<SpendingFilter>('week');
  const [spendingType, setSpendingType] = useState<SpendingType>('all');
  const [cardIndex, setCardIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [copiedCardNum, setCopiedCardNum] = useState(false);
  const [frozenCard, setFrozenCard] = useState(false);
  const [quickSendSuccess, setQuickSendSuccess] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<string | null>(null);

  const currencyRate = selectedCurrency === 'EUR' ? 0.92 : selectedCurrency === 'GBP' ? 0.77 : 1;
  const currencySymbol = selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'GBP' ? '£' : '$';

  const quickContacts = [
    { name: 'Sarah Miller', tag: 'Direct SEPA', avatar: 'SM', color: '#e8611a' },
    { name: 'Alexander Ross', tag: 'Instant Wire', avatar: 'AR', color: '#3b82f6' },
    { name: 'Elena Vance', tag: 'Vault Transfer', avatar: 'EV', color: '#10b981' },
    { name: 'David Cho', tag: 'FedWire Priority', avatar: 'DC', color: '#8b5cf6' },
  ];

  const text = useMemo(
    () =>
      locale === 'fr'
        ? {
            totalBalance: 'Solde total',
            agencyShort: 'Ag.',
            accountShort: 'Compte',
            copied: 'Copié !',
            copy: 'Copier le compte',
            sendMoney: "Envoyer de l'argent",
            receive: 'Recevoir',
            spendingOverview: 'Aperçu des dépenses',
            thisWeek: 'Cette semaine',
            thisMonth: 'Ce mois',
            allTime: 'Tout',
            all: 'Toutes',
            income: 'Revenus',
            expenses: 'Dépenses',
            transfers: 'Virements',
            amount: 'Montant',
            avgPerDay: 'Moyenne / jour',
            highestDay: 'Jour max',
            transactions: 'Transactions',
            recentTransactions: 'Transactions récentes',
            seeAll: 'Voir tout',
            noTransactionsYet: 'Aucune transaction pour le moment',
            depositReceived: 'Dépôt reçu',
            withdrawal: 'Retrait',
            transferTo: 'Virement vers',
            completed: 'Terminée',
            failed: 'Échouée',
            pending: 'En attente',
            myCards: 'Mes cartes',
            active: 'Actives',
            addCard: 'Ajouter une carte',
            noCardsYet: 'Aucune carte pour le moment',
            quickActions: 'Actions rapides',
            portfolio: 'Portefeuille',
            activeInvestments: 'Investissements actifs',
            cardCarousel: 'Mes cartes',
            quickSend: 'Accès direct',
            deposit: 'Dépôt',
            transfer: 'Virement',
            paymentKey: 'Clé de paiement',
            noInvestments: 'Aucun investissement',
            loading: 'Chargement...',
            balanceProtected: 'Protection bancaire 256 bits active',
          }
        : {
            totalBalance: 'Total Balance',
            agencyShort: 'Branch',
            accountShort: 'Account',
            copied: 'Copied!',
            copy: 'Copy Account',
            sendMoney: 'Deposit & Send',
            receive: 'Withdraw Funds',
            spendingOverview: 'Spending & Cash Flow',
            thisWeek: 'This Week',
            thisMonth: 'This Month',
            allTime: 'All Time',
            all: 'All',
            income: 'Income',
            expenses: 'Expenses',
            transfers: 'Transfers',
            amount: 'Amount',
            avgPerDay: 'Average / day',
            highestDay: 'Peak day',
            transactions: 'Transactions',
            recentTransactions: 'Recent Transactions',
            seeAll: 'See all',
            noTransactionsYet: 'No transactions yet',
            depositReceived: 'Deposit received',
            withdrawal: 'Withdrawal',
            transferTo: 'Transfer to',
            completed: 'Completed',
            failed: 'Failed',
            pending: 'Pending',
            myCards: 'My Cards',
            active: 'Active',
            addCard: 'Add Card',
            noCardsYet: 'No cards yet',
            quickActions: 'Quick Actions',
            portfolio: 'Investment Portfolio',
            activeInvestments: 'Active investments',
            cardCarousel: 'Wallet cards',
            quickSend: 'One-click shortcuts',
            deposit: 'Deposit',
            transfer: 'Transfer',
            paymentKey: 'Payment Key',
            noInvestments: 'No investments',
            loading: 'Loading...',
            balanceProtected: '256-bit bank-grade encryption',
          },
    [locale]
  );

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['account'],
    queryFn: accountApi.getMyAccount,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: accountApi.getHistory,
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: cardsApi.getMyCards,
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: investmentsApi.getMyInvestments,
  });

  const activeInvestments = investments.filter((investment) => investment.status === 'ACTIVE');
  const totalInvested = activeInvestments.reduce((sum, investment) => sum + investment.amount, 0);
  const totalCurrent = activeInvestments.reduce((sum, investment) => sum + investment.currentValue, 0);
  const investmentGain = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : null;

  const copyAccountNumber = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account.number);
    setCopySuccess(true);
    window.setTimeout(() => setCopySuccess(false), 2000);
  };

  const now = new Date();
  const filteredTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.createdAt);
    const typeMatch = spendingType === 'all' || transaction.type === spendingType;

    if (spendingFilter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return date >= startOfWeek && typeMatch;
    }

    if (spendingFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth && typeMatch;
    }

    return typeMatch;
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = weekDays.map((day) => ({ day, value: 0 }));
  filteredTransactions.forEach((transaction) => {
    const date = new Date(transaction.createdAt);
    weeklyData[date.getDay()].value += Number(transaction.amount);
  });

  const totalSpending = weeklyData.reduce((sum, entry) => sum + entry.value, 0);
  const maxDay = weeklyData.reduce((max, entry) => (entry.value > max.value ? entry : max), weeklyData[0]);
  const avgDay = totalSpending / 7;

  const visibleCard = cards[cardIndex];

  const quickActions: QuickAction[] = [
    {
      label: text.deposit,
      icon: Send,
      color: '#10b981',
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
      action: () => navigate('/transactions?tab=deposit'),
    },
    {
      label: text.transfer,
      icon: ArrowLeftRight,
      color: '#3b82f6',
      bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      action: () => navigate('/transactions?tab=transfer'),
    },
    {
      label: text.paymentKey,
      icon: Zap,
      color: '#e8611a',
      bg: isDark ? 'rgba(232, 97, 26, 0.15)' : '#fff7ed',
      action: () => navigate('/transactions?tab=payment'),
    },
    {
      label: text.addCard,
      icon: Plus,
      color: '#8b5cf6',
      bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff',
      action: () => navigate('/cards'),
    },
  ];

  return (
    <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 } }}>
      {/* ── PREMIUM HERO BALANCE BANNER ── */}
      <Card
        sx={{
          borderRadius: 5,
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, rgba(232,97,26,0.18) 0%, rgba(24,24,27,0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255,247,237,0.95) 0%, rgba(255,255,255,0.98) 50%, rgba(238,242,255,0.7) 100%)',
          border: 1,
          borderColor: isDark ? 'rgba(232,97,26,0.25)' : 'rgba(232,97,26,0.15)',
          boxShadow: isDark
            ? '0 12px 36px -8px rgba(0,0,0,0.6)'
            : '0 12px 36px -8px rgba(232,97,26,0.08)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5, md: 4.5 } }}>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' },
              alignItems: 'stretch',
            }}
          >
            {/* Left Hero Column: Balance & Controls */}
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                {/* Top Badge */}
                <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                  <Chip
                    icon={<Sparkles className='w-3.5 h-3.5 text-primary-500' />}
                    label='FinBank Premier'
                    size='small'
                    sx={{
                      fontWeight: 700,
                      bgcolor: isDark ? 'rgba(232,97,26,0.18)' : '#ffedd5',
                      color: 'primary.main',
                      fontSize: 11,
                      border: 1,
                      borderColor: 'primary.light',
                    }}
                  />
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ShieldCheck className='w-3.5 h-3.5 text-emerald-500' />
                    {text.balanceProtected}
                  </Typography>
                </Stack>

                {/* Balance Line with Hide/Show Toggle & Currency Switcher */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        lineHeight: 1,
                        letterSpacing: '-0.03em',
                        fontSize: { xs: '2.1rem', sm: '2.75rem', md: '3.25rem' },
                      }}
                    >
                      {accountLoading
                        ? text.loading
                        : hideBalance
                        ? '••••••••'
                        : `${currencySymbol}${((account?.balance || 0) * currencyRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </Typography>
                    <Tooltip title={hideBalance ? 'Show balance' : 'Hide balance'}>
                      <IconButton
                        onClick={() => setHideBalance(!hideBalance)}
                        size='small'
                        sx={{ color: 'text.secondary', p: 0.5 }}
                      >
                        {hideBalance ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Currency Selector Chips */}
                  <Stack direction='row' spacing={0.75}>
                    {(['USD', 'EUR', 'GBP'] as const).map((curr) => (
                      <Chip
                        key={curr}
                        label={curr}
                        size='small'
                        onClick={() => setSelectedCurrency(curr)}
                        clickable
                        variant={selectedCurrency === curr ? 'filled' : 'outlined'}
                        color={selectedCurrency === curr ? 'primary' : 'default'}
                        sx={{ fontWeight: 800, fontSize: 11, height: 26 }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Account details */}
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 1.25, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                >
                  <span>{text.totalBalance}</span>
                  <span>•</span>
                  <span>
                    {text.agencyShort}: <strong>{account?.agency || '0001'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    {text.accountShort}: <strong>{account?.number || '--------'}</strong>
                  </span>
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Stack direction='row' spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: { xs: 1, sm: 1.5 } }}>
                <Button
                  variant='contained'
                  startIcon={<Send className='h-4 w-4' />}
                  onClick={() => navigate('/transactions?tab=deposit')}
                  sx={{ py: 1.2, px: { xs: 2, sm: 2.5 } }}
                >
                  {text.sendMoney}
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<Download className='h-4 w-4' />}
                  onClick={() => navigate('/transactions?tab=withdraw')}
                  sx={{ py: 1.2, px: { xs: 2, sm: 2.5 } }}
                >
                  {text.receive}
                </Button>
                <Button
                  variant='text'
                  startIcon={<Copy className='h-4 w-4' />}
                  onClick={copyAccountNumber}
                  sx={{
                    color: copySuccess ? 'success.main' : 'text.secondary',
                    fontWeight: 600,
                  }}
                >
                  {copySuccess ? text.copied : text.copy}
                </Button>
              </Stack>
            </Box>

            {/* Right Hero Column: Portfolio & Positions Quick Card */}
            <Box sx={{ display: 'grid', gap: 2, alignContent: 'center' }}>
              <Card
                variant='outlined'
                sx={{
                  borderRadius: 4,
                  bgcolor: isDark ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant='caption' sx={{ letterSpacing: 1.2, textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
                      {text.portfolio}
                    </Typography>
                    {investmentGain !== null && (
                      <Chip
                        size='small'
                        icon={investmentGain >= 0 ? <TrendingUp className='w-3 h-3 text-emerald-600' /> : <TrendingDown className='w-3 h-3 text-rose-600' />}
                        label={`${investmentGain >= 0 ? '+' : ''}${investmentGain.toFixed(2)}%`}
                        sx={{
                          fontWeight: 700,
                          fontSize: 11,
                          bgcolor: investmentGain >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: investmentGain >= 0 ? 'success.main' : 'error.main',
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant='h5' sx={{ fontWeight: 800, mt: 1 }}>
                    {formatCurrency(totalCurrent)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                    {activeInvestments.length} {text.activeInvestments.toLowerCase()}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={Math.min(100, Math.max(10, Math.abs(investmentGain || 25)))}
                    sx={{ mt: 1.75, height: 8, borderRadius: 999 }}
                  />
                </CardContent>
              </Card>

              <Card
                variant='outlined'
                sx={{
                  borderRadius: 4,
                  bgcolor: isDark ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <CardContent sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant='caption' sx={{ letterSpacing: 1.2, textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
                      {text.myCards}
                    </Typography>
                    <Typography variant='body1' sx={{ fontWeight: 800, mt: 0.5 }}>
                      {cards.length} {text.active.toLowerCase()}
                    </Typography>
                  </Box>
                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<Plus className='w-3.5 h-3.5' />}
                    onClick={() => navigate('/cards')}
                    sx={{ borderRadius: 3 }}
                  >
                    {text.addCard}
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── INTERACTIVE QUICK TRANSFER TO CONTACTS ── */}
      <Card sx={{ borderRadius: 4, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
              <Zap className='w-4 h-4 text-orange-500' />
              <Typography variant='caption' sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'text.secondary' }}>
                Instant Transfer to Contacts
              </Typography>
            </Stack>
            {quickSendSuccess && (
              <Chip
                icon={<CheckCircle2 className='w-3.5 h-3.5 text-emerald-500' />}
                label={quickSendSuccess}
                size='small'
                color='success'
                variant='outlined'
                sx={{ fontWeight: 700, fontSize: 11 }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, overflowX: 'auto', pb: 0.5 }} className='no-scrollbar'>
            {quickContacts.map((contact) => {
              const isSelected = activeContact === contact.name;
              return (
                <Box
                  key={contact.name}
                  onClick={() => {
                    setActiveContact(isSelected ? null : contact.name);
                    setQuickSendSuccess(null);
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    p: 1.2,
                    borderRadius: 3,
                    minWidth: 105,
                    bgcolor: isSelected ? 'action.selected' : 'action.hover',
                    border: 2,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateY(-2px)' },
                  }}
                >
                  <Avatar sx={{ bgcolor: contact.color, color: '#ffffff', fontWeight: 800, width: 42, height: 42, mb: 1, boxShadow: isSelected ? '0 4px 12px rgba(232,97,26,0.3)' : 'none' }}>
                    {contact.avatar}
                  </Avatar>
                  <Typography variant='caption' sx={{ fontWeight: 800, textAlign: 'center', color: 'text.primary', lineHeight: 1.2 }}>
                    {contact.name.split(' ')[0]}
                  </Typography>
                  <Typography variant='caption' sx={{ fontSize: 9.5, color: 'text.secondary', mt: 0.25 }}>
                    {contact.tag}
                  </Typography>
                </Box>
              );
            })}

            {/* + New Beneficiary shortcut */}
            <Box
              onClick={() => navigate('/transactions?tab=transfer')}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                p: 1.2,
                borderRadius: 3,
                minWidth: 95,
                border: '2px dashed',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
              }}
            >
              <Box sx={{ width: 42, height: 42, borderRadius: '50%', border: 1, borderColor: 'divider', display: 'grid', placeItems: 'center', color: 'text.secondary', mb: 1 }}>
                <Plus className='w-5 h-5' />
              </Box>
              <Typography variant='caption' sx={{ fontWeight: 700, color: 'text.secondary' }}>
                New Recipient
              </Typography>
            </Box>
          </Box>

          {/* If contact selected, show quick transfer action chips */}
          {activeContact && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
              <Typography variant='body2' sx={{ fontWeight: 700 }}>
                Transfer to <Box component='span' sx={{ color: 'primary.main' }}>{activeContact}</Box>:
              </Typography>
              <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                {[25, 50, 100, 250, 500].map((amt) => (
                  <Button
                    key={amt}
                    size='small'
                    variant='outlined'
                    onClick={() => {
                      setQuickSendSuccess(`Sent $${amt}.00 to ${activeContact}!`);
                      setTimeout(() => setQuickSendSuccess(null), 3500);
                    }}
                    sx={{ borderRadius: 2, fontWeight: 800, fontSize: 11, py: 0.5 }}
                  >
                    ${amt}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── 4 STAT CARDS (RESPONSIVE GRID) ── */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        <StatCard
          label={text.totalBalance}
          value={formatCurrency(account?.balance || 0)}
          sub={`${text.agencyShort}: ${account?.agency || '0001'}`}
          icon={CreditCard}
          accent='#e8611a'
          bg={isDark ? 'rgba(232, 97, 26, 0.15)' : '#fff7ed'}
        />
        <StatCard
          label={text.activeInvestments}
          value={String(activeInvestments.length)}
          sub={formatCurrency(totalCurrent)}
          icon={TrendingUp}
          accent='#10b981'
          bg={isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5'}
        />
        <StatCard
          label={text.recentTransactions}
          value={String(transactions.length)}
          sub={text.seeAll}
          icon={ArrowLeftRight}
          accent='#3b82f6'
          bg={isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff'}
        />
        <StatCard
          label={text.myCards}
          value={String(cards.length)}
          sub={`${cards.length} ${text.active.toLowerCase()}`}
          icon={CreditCard}
          accent='#8b5cf6'
          bg={isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff'}
        />
      </Box>

      {/* ── SPENDING OVERVIEW & SIDEBAR SHORTCUTS ── */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' },
        }}
      >
        {/* Left: Spending & Recharts Chart */}
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5, md: 4 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
                mb: 2.5,
              }}
            >
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                  {text.spendingOverview}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {formatCurrency(totalSpending)}
                </Typography>
              </Box>

              {/* Timeframe Filter Buttons */}
              <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                {(['week', 'month', 'all'] as SpendingFilter[]).map((filter) => (
                  <Button
                    key={filter}
                    variant={spendingFilter === filter ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() => setSpendingFilter(filter)}
                    sx={{ px: 1.75, py: 0.5, fontSize: 12, borderRadius: 2 }}
                  >
                    {filter === 'week' ? text.thisWeek : filter === 'month' ? text.thisMonth : text.allTime}
                  </Button>
                ))}
              </Stack>
            </Box>

            {/* Category Chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
              {(
                [
                  { key: 'all', label: text.all },
                  { key: 'DEPOSIT', label: text.income },
                  { key: 'WITHDRAWAL', label: text.expenses },
                  { key: 'TRANSFER', label: text.transfers },
                ] as { key: SpendingType; label: string }[]
              ).map((entry) => (
                <Chip
                  key={entry.key}
                  label={entry.label}
                  color={spendingType === entry.key ? 'primary' : 'default'}
                  variant={spendingType === entry.key ? 'filled' : 'outlined'}
                  onClick={() => setSpendingType(entry.key)}
                  clickable
                  sx={{ fontWeight: 600, fontSize: 12 }}
                />
              ))}
            </Box>

            {/* Chart Area */}
            <ResponsiveContainer width='100%' height={240}>
              <BarChart data={weeklyData}>
                <XAxis dataKey='day' stroke={isDark ? '#52525b' : '#cbd5e1'} tick={{ fill: isDark ? '#a1a1aa' : '#64748b', fontSize: 12 }} />
                <YAxis stroke={isDark ? '#52525b' : '#cbd5e1'} tick={{ fill: isDark ? '#a1a1aa' : '#64748b', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    border: `1px solid ${isDark ? '#3f3f46' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), text.amount]}
                />
                <Bar dataKey='value' fill='#e8611a' radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <Divider sx={{ my: 3 }} />

            {/* Bottom 3 metrics */}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.25 }}>
                  {text.avgPerDay}
                </Typography>
                <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                  {formatCurrency(avgDay)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.25 }}>
                  {text.highestDay}
                </Typography>
                <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                  {maxDay.day} · {formatCurrency(maxDay.value)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.25 }}>
                  {text.transactions}
                </Typography>
                <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                  {filteredTransactions.length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Right: Quick Actions & Wallet Card */}
        <Stack spacing={3}>
          {/* Quick Actions */}
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                  {text.quickActions}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {text.quickSend}
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr' } }}>
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    onClick={action.action}
                    variant='outlined'
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      px: 2,
                      py: 1.25,
                      textTransform: 'none',
                      transition: 'transform 0.15s ease',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      },
                    }}
                    startIcon={
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: action.bg,
                          color: action.color,
                        }}
                      >
                        <action.icon className='h-4.5 w-4.5' />
                      </Box>
                    }
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{action.label}</Typography>
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Interactive Virtual Card */}
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant='h6' sx={{ fontWeight: 800 }}>
                    {text.myCards}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {cards.length ? `${cards.length} ${text.active}` : text.noCardsYet}
                  </Typography>
                </Box>
                {cards.length > 1 && (
                  <Stack direction='row' spacing={1}>
                    <IconButton
                      size='small'
                      onClick={() => setCardIndex((index) => Math.max(index - 1, 0))}
                      disabled={cardIndex === 0}
                      sx={{ border: 1, borderColor: 'divider' }}
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </IconButton>
                    <IconButton
                      size='small'
                      onClick={() => setCardIndex((index) => Math.min(index + 1, Math.max(cards.length - 1, 0)))}
                      disabled={cardIndex >= cards.length - 1}
                      sx={{ border: 1, borderColor: 'divider' }}
                    >
                      <ChevronRight className='h-4 w-4' />
                    </IconButton>
                  </Stack>
                )}
              </Box>

              {visibleCard ? (
                <Box
                  className={frozenCard ? 'card-frozen' : ''}
                  sx={{
                    borderRadius: 4,
                    p: 3,
                    color: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 16px 32px -8px rgba(0,0,0,0.3)',
                    background:
                      visibleCard.brand === 'VISA'
                        ? 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)'
                        : visibleCard.brand === 'MASTERCARD'
                        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
                        : visibleCard.brand === 'ELO'
                        ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
                        : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                  }}
                >
                  {/* Frosted Freeze Lock Overlay if frozen */}
                  {frozenCard && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 12,
                        bgcolor: 'rgba(14, 165, 233, 0.45)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      <Lock className='w-8 h-8 text-white mb-1' />
                      <Typography variant='caption' sx={{ fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        CARD FROZEN
                      </Typography>
                    </Box>
                  )}

                  {/* Card Header: Chip + Wifi + Brand */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 26,
                          borderRadius: 1,
                          bgcolor: 'rgba(255, 255, 255, 0.85)',
                          border: '1px solid rgba(0,0,0,0.2)',
                          backgroundImage:
                            'linear-gradient(135deg, #fbbf24 25%, #f59e0b 25%, #f59e0b 50%, #fbbf24 50%, #fbbf24 75%, #f59e0b 75%, #f59e0b 100%)',
                          backgroundSize: '8px 8px',
                        }}
                      />
                      <Wifi className='w-4 h-4 text-white/80 rotate-90' />
                    </Stack>
                    <Typography variant='subtitle1' sx={{ fontWeight: 900, letterSpacing: 1.5 }}>
                      {visibleCard.brand}
                    </Typography>
                  </Box>

                  {/* Masked Card Number & Copy action */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 1.5 }}>
                    <Typography
                      variant='h6'
                      sx={{
                        fontFamily: 'monospace',
                        letterSpacing: 2.5,
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      •••• •••• •••• {visibleCard.lastFour}
                    </Typography>
                    <Tooltip title={copiedCardNum ? 'Card number copied!' : 'Copy card number'}>
                      <IconButton
                        size='small'
                        onClick={async () => {
                          await navigator.clipboard.writeText(`482900000000${visibleCard.lastFour}`);
                          setCopiedCardNum(true);
                          setTimeout(() => setCopiedCardNum(false), 2000);
                        }}
                        sx={{ color: '#ffffff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
                      >
                        {copiedCardNum ? <Check className='w-4 h-4 text-emerald-300' /> : <Copy className='w-4 h-4' />}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Card Footer: Holder & Expiration */}
                  <Stack direction='row' spacing={2} sx={{ mt: 2.5, justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <Box>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Cardholder
                      </Typography>
                      <Typography variant='body2' sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {visibleCard.holderName}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Expires
                      </Typography>
                      <Typography variant='body2' sx={{ fontWeight: 700 }}>
                        {String(visibleCard.expiryMonth).padStart(2, '0')}/{visibleCard.expiryYear}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 3 }}>
                  <CreditCard className='w-8 h-8 text-gray-400 mx-auto mb-1' />
                  <Typography variant='body2' color='text.secondary'>
                    {text.noCardsYet}
                  </Typography>
                  <Button
                    variant='contained'
                    size='small'
                    startIcon={<Plus className='w-4 h-4' />}
                    onClick={() => navigate('/cards')}
                    sx={{ mt: 2 }}
                  >
                    {text.addCard}
                  </Button>
                </Box>
              )}

              {/* Quick Card Controls */}
              {visibleCard && (
                <Stack direction='row' spacing={1} sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    size='small'
                    variant='outlined'
                    onClick={() => setFrozenCard(!frozenCard)}
                    startIcon={frozenCard ? <Unlock className='w-3.5 h-3.5 text-emerald-500' /> : <Lock className='w-3.5 h-3.5 text-sky-500' />}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontSize: 12, fontWeight: 700 }}
                  >
                    {frozenCard ? 'Unfreeze' : 'Freeze'}
                  </Button>
                  <Button
                    fullWidth
                    size='small'
                    variant='outlined'
                    onClick={() => navigate('/cards')}
                    startIcon={<CreditCard className='w-3.5 h-3.5' />}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontSize: 12, fontWeight: 700 }}
                  >
                    Card Hub
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>

      {/* ── RECENT TRANSACTIONS CARD ── */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                {text.recentTransactions}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Click any transaction to view official receipt
              </Typography>
            </Box>
            <Button variant='text' onClick={() => navigate('/history')} sx={{ fontWeight: 700 }}>
              {text.seeAll}
            </Button>
          </Box>

          {transactions.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ py: 6, textAlign: 'center' }}>
              {text.noTransactionsYet}
            </Typography>
          ) : (
            <List disablePadding>
              {transactions.slice(0, 6).map((transaction) => (
                <ListItem
                  key={transaction.id}
                  onClick={() => setSelectedReceipt(transaction)}
                  disableGutters
                  sx={{
                    py: 1.5,
                    px: 1.5,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateX(3px)' },
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <ListItemAvatar>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 3,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor:
                          transaction.type === 'DEPOSIT'
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.15)'
                              : '#ecfdf5'
                            : transaction.type === 'WITHDRAWAL'
                            ? isDark
                              ? 'rgba(239, 68, 68, 0.15)'
                              : '#fef2f2'
                            : isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : '#eff6ff',
                        color:
                          transaction.type === 'DEPOSIT'
                            ? '#10b981'
                            : transaction.type === 'WITHDRAWAL'
                            ? '#ef4444'
                            : '#3b82f6',
                      }}
                    >
                      {transaction.type === 'DEPOSIT' ? (
                        <TrendingUp className='h-5 w-5' />
                      ) : transaction.type === 'WITHDRAWAL' ? (
                        <TrendingDown className='h-5 w-5' />
                      ) : (
                        <ArrowLeftRight className='h-5 w-5' />
                      )}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                        {transaction.description || transaction.type}
                      </Typography>
                    }
                    secondary={`${formatDate(transaction.createdAt)} • Click for receipt`}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Typography
                      variant='subtitle2'
                      sx={{
                        fontWeight: 800,
                        color: transaction.type === 'DEPOSIT' ? 'success.main' : 'error.main',
                        fontSize: { xs: 13, sm: 15 },
                      }}
                    >
                      {transaction.type === 'DEPOSIT' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </Typography>
                    <Chip
                      size='small'
                      label={
                        transaction.status === 'COMPLETED'
                          ? text.completed
                          : transaction.status === 'FAILED'
                          ? text.failed
                          : text.pending
                      }
                      variant='outlined'
                      sx={{ fontSize: 10, height: 20 }}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* ── TRANSACTION RECEIPT DIALOG ── */}
      <Dialog
        open={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        fullWidth
        maxWidth='xs'
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              bgcolor: 'background.paper',
              p: 1,
            },
          },
        }}
      >
        {selectedReceipt && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2.5, bgcolor: 'primary.main', display: 'grid', placeItems: 'center', color: '#ffffff' }}>
                  <Sparkles className='w-4 h-4' />
                </Box>
                <Box>
                  <Typography variant='subtitle1' sx={{ fontWeight: 800 }}>
                    Official Receipt
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    FinBank ClearSettle #TX-{selectedReceipt.id}
                  </Typography>
                </Box>
              </Stack>
              <IconButton size='small' onClick={() => setSelectedReceipt(null)}>
                <X className='w-4 h-4' />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover', textAlign: 'center', border: 1, borderColor: 'divider' }}>
                <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1.5 }}>
                  {selectedReceipt.type}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 900, my: 0.5, color: selectedReceipt.type === 'DEPOSIT' ? 'success.main' : 'text.primary' }}>
                  {selectedReceipt.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(selectedReceipt.amount)}
                </Typography>
                <Chip
                  icon={<CheckCircle2 className='w-3.5 h-3.5' />}
                  label='Verified & Cleared'
                  color='success'
                  size='small'
                  variant='outlined'
                  sx={{ fontWeight: 700, fontSize: 11 }}
                />
              </Box>

              <Stack spacing={1.2} sx={{ p: 1.5, borderRadius: 2.5, border: 1, borderColor: 'divider', fontSize: 13 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Description</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 700 }}>{selectedReceipt.description || selectedReceipt.type}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Date & Time</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 700 }}>{new Date(selectedReceipt.createdAt).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Settlement Network</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 700, color: 'text.primary' }}>SEPA Instant / FedWire RTGS</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Fee</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 700, color: 'success.main' }}>$0.00 (Tier Free)</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' color='text.secondary'>Security Status</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 700, color: 'text.primary' }}>256-bit TLS Encrypted</Typography>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 0 }}>
              <Button
                fullWidth
                variant='contained'
                startIcon={<Download className='w-4 h-4' />}
                onClick={() => setSelectedReceipt(null)}
              >
                Download PDF Statement
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
