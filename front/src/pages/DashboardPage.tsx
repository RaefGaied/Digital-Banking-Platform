import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Divider, LinearProgress, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from '@mui/material';
import { TrendingUp, TrendingDown, ArrowLeftRight, Copy, Send, Download, CreditCard, Zap, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { accountApi } from '../api/account';
import { cardsApi } from '../api/cards';
import { investmentsApi } from '../api/investments';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useI18n } from '../i18n/I18nContext';


type SpendingFilter = 'week' | 'month' | 'all';
type SpendingType = 'all' | 'WITHDRAWAL' | 'TRANSFER' | 'DEPOSIT';

type QuickAction = {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  action: () => void;
};

function StatCard({ label, value, sub, icon: Icon, accent, bg }: { label: string; value: string; sub: string; icon: React.ElementType; accent: string; bg: string; }) {
  return (
    <Card sx={{ borderRadius: 4, height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: 2.4 }}>
              {label}
            </Typography>
            <Typography variant='h5' sx={{ mt: 1, fontWeight: 800, lineHeight: 1.1 }}>
              {value}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {sub}
            </Typography>
          </Box>
          <Box sx={{ width: 40, height: 40, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: bg, color: accent, flexShrink: 0 }}>
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
  const [spendingFilter, setSpendingFilter] = useState<SpendingFilter>('week');
  const [spendingType, setSpendingType] = useState<SpendingType>('all');
  const [cardIndex, setCardIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

  const text = useMemo(() => locale === 'fr'
    ? {
        totalBalance: 'Solde total',
        agencyShort: 'Ag',
        accountShort: 'Compte',
        copied: 'Copie !',
        copy: 'Copier',
        sendMoney: "Envoyer de l'argent",
        receive: 'Recevoir',
        spendingOverview: 'Apercu des depenses',
        thisWeek: 'Cette semaine',
        thisMonth: 'Ce mois',
        allTime: 'Tout',
        all: 'Toutes',
        income: 'Revenus',
        expenses: 'Depenses',
        transfers: 'Virements',
        amount: 'Montant',
        avgPerDay: 'Moyenne/jour',
        highestDay: 'Jour max',
        transactions: 'Transactions',
        recentTransactions: 'Transactions recentes',
        seeAll: 'Voir tout',
        noTransactionsYet: 'Aucune transaction pour le moment',
        depositReceived: 'Depot recu',
        withdrawal: 'Retrait',
        transferTo: 'Virement vers',
        account: 'compte',
        from: 'De',
        completed: 'Terminee',
        failed: 'Echouee',
        pending: 'En attente',
        myCards: 'Mes cartes',
        active: 'Actives',
        paymentTransfers: 'Virements de paiement',
        quickSend: 'Envoi rapide',
        investments: 'Investissements',
        noInvestments: 'Aucun investissement',
        addCard: 'Ajouter une carte',
        noCardsYet: 'Aucune carte pour le moment',
        paymentAndTransfers: 'Paiements et virements',
        qrCode: 'QR Code',
        paymentKey: 'Cle de paiement',
        transfer: 'Virement',
        deposit: 'Depot',
        myPaymentKey: 'Ma cle de paiement',
        loading: 'Chargement...',
        share: 'Partager',
        quickActions: 'Actions rapides',
        portfolio: 'Portefeuille',
        activeInvestments: 'Investissements actifs',
        cardCarousel: 'Mes cartes',
      }
    : {
        totalBalance: 'Total Balance',
        agencyShort: 'Ag',
        accountShort: 'Account',
        copied: 'Copied!',
        copy: 'Copy',
        sendMoney: 'Send Money',
        receive: 'Receive',
        spendingOverview: 'Spending Overview',
        thisWeek: 'This Week',
        thisMonth: 'This Month',
        allTime: 'All Time',
        all: 'All',
        income: 'Income',
        expenses: 'Expenses',
        transfers: 'Transfers',
        amount: 'Amount',
        avgPerDay: 'Average/day',
        highestDay: 'Highest day',
        transactions: 'Transactions',
        recentTransactions: 'Recent Transactions',
        seeAll: 'See all',
        noTransactionsYet: 'No transactions yet',
        depositReceived: 'Deposit received',
        withdrawal: 'Withdrawal',
        transferTo: 'Transfer to',
        account: 'account',
        from: 'From',
        completed: 'Completed',
        failed: 'Failed',
        pending: 'Pending',
        myCards: 'My Cards',
        active: 'Active',
        paymentTransfers: 'Payment Transfers',
        quickSend: 'Quick Send',
        investments: 'Investments',
        noInvestments: 'No investments',
        addCard: 'Add Card',
        noCardsYet: 'No cards yet',
        paymentAndTransfers: 'Payments & Transfers',
        qrCode: 'QR Code',
        paymentKey: 'Payment Key',
        transfer: 'Transfer',
        deposit: 'Deposit',
        myPaymentKey: 'My Payment Key',
        loading: 'Loading...',
        share: 'Share',
        quickActions: 'Quick actions',
        portfolio: 'Portfolio',
        activeInvestments: 'Active investments',
        cardCarousel: 'My cards',
      }, [locale]);

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

  const activeInvestments = investments.filter(investment => investment.status === 'ACTIVE');
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
  const filteredTransactions = transactions.filter(transaction => {
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
  const weeklyData = weekDays.map(day => ({ day, value: 0 }));
  filteredTransactions.forEach(transaction => {
    const date = new Date(transaction.createdAt);
    weeklyData[date.getDay()].value += Number(transaction.amount);
  });

  const totalSpending = weeklyData.reduce((sum, entry) => sum + entry.value, 0);
  const maxDay = weeklyData.reduce((max, entry) => (entry.value > max.value ? entry : max), weeklyData[0]);
  const avgDay = totalSpending / 7;

  const visibleCard = cards[cardIndex];

  const quickActions: QuickAction[] = [
    { label: text.deposit, icon: Send, color: '#16a34a', bg: '#f0fdf4', action: () => navigate('/transactions?tab=deposit') },
    { label: text.transfer, icon: ArrowLeftRight, color: '#2563eb', bg: '#eff6ff', action: () => navigate('/transactions?tab=transfer') },
    { label: text.paymentKey, icon: Zap, color: '#e8611a', bg: '#fff7ed', action: () => navigate('/transactions?tab=payment') },
    { label: text.addCard, icon: Plus, color: '#7c3aed', bg: '#f5f3ff', action: () => navigate('/cards') },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card
        sx={{
          borderRadius: 5,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(232,97,26,0.12), rgba(255,255,255,0.98))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, alignItems: 'stretch' }}>
            <Box>
              <Typography variant='overline' sx={{ color: 'primary.main', letterSpacing: 3, fontWeight: 700 }}>
                FinBank dashboard
              </Typography>
              <Typography variant='h3' sx={{ fontWeight: 900, lineHeight: 1.05, mt: 1 }}>
                {accountLoading ? text.loading : formatCurrency(account?.balance || 0)}
              </Typography>
              <Typography variant='body1' color='text.secondary' sx={{ mt: 1.5, maxWidth: 680, lineHeight: 1.8 }}>
                {text.totalBalance} · {text.agencyShort}: {account?.agency || '----'} · {text.accountShort}: {account?.number || '--------'}
              </Typography>

              <Stack direction='row' spacing={1.5} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                <Button variant='contained' startIcon={<Send className='h-4 w-4' />} onClick={() => navigate('/transactions?tab=deposit')}>
                  {text.sendMoney}
                </Button>
                <Button variant='outlined' startIcon={<Download className='h-4 w-4' />} onClick={() => navigate('/transactions?tab=withdraw')}>
                  {text.receive}
                </Button>
                <Button variant='text' startIcon={<Copy className='h-4 w-4' />} onClick={copyAccountNumber}>
                  {copySuccess ? text.copied : text.copy}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ display: 'grid', gap: 2 }}>
              <Card variant='outlined' sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant='overline' color='text.secondary'>Portfolio</Typography>
                  <Typography variant='h5' sx={{ fontWeight: 800, mt: 0.5 }}>
                    {formatCurrency(totalCurrent)}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                    {investmentGain !== null ? `${investmentGain >= 0 ? '+' : ''}${investmentGain.toFixed(2)}%` : text.noInvestments}
                  </Typography>
                  <LinearProgress variant='determinate' value={Math.min(100, Math.abs(investmentGain || 0))} sx={{ mt: 2, height: 10, borderRadius: 999 }} />
                </CardContent>
              </Card>

              <Card variant='outlined' sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant='overline' color='text.secondary'>Quick status</Typography>
                  <Typography variant='body1' sx={{ fontWeight: 700, mt: 0.5 }}>
                    {activeInvestments.length} {text.activeInvestments}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                    {cards.length} {text.myCards.toLowerCase()}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' } }}>
        <StatCard label={text.totalBalance} value={formatCurrency(account?.balance || 0)} sub={`${text.agencyShort}: ${account?.agency || '----'}`} icon={CreditCard} accent='#e8611a' bg='#fff7ed' />
        <StatCard label={text.activeInvestments} value={String(activeInvestments.length)} sub={text.portfolio} icon={TrendingUp} accent='#16a34a' bg='#f0fdf4' />
        <StatCard label={text.recentTransactions} value={String(transactions.length)} sub={text.quickActions} icon={ArrowLeftRight} accent='#2563eb' bg='#eff6ff' />
        <StatCard label={text.myCards} value={String(cards.length)} sub={text.cardCarousel} icon={CreditCard} accent='#7c3aed' bg='#f5f3ff' />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.15fr 0.85fr' } }}>
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 800 }}>{text.spendingOverview}</Typography>
                <Typography variant='body2' color='text.secondary'>{formatCurrency(totalSpending)}</Typography>
              </Box>
              <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {(['week', 'month', 'all'] as SpendingFilter[]).map(filter => (
                  <Button
                    key={filter}
                    variant={spendingFilter === filter ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() => setSpendingFilter(filter)}
                  >
                    {filter === 'week' ? text.thisWeek : filter === 'month' ? text.thisMonth : text.allTime}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
              {([
                { key: 'all', label: text.all },
                { key: 'DEPOSIT', label: text.income },
                { key: 'WITHDRAWAL', label: text.expenses },
                { key: 'TRANSFER', label: text.transfers },
              ] as { key: SpendingType; label: string }[]).map(entry => (
                <Chip
                  key={entry.key}
                  label={entry.label}
                  color={spendingType === entry.key ? 'primary' : 'default'}
                  variant={spendingType === entry.key ? 'filled' : 'outlined'}
                  onClick={() => setSpendingType(entry.key)}
                  clickable
                />
              ))}
            </Box>

            <ResponsiveContainer width='100%' height={220}>
              <BarChart data={weeklyData}>
                <XAxis dataKey='day' stroke='#e5e7eb' tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke='#e5e7eb' tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  formatter={(value) => [formatCurrency(Number(value)), text.amount]}
                />
                <Bar dataKey='value' fill='#e8611a' radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='caption' color='text.secondary'>{text.avgPerDay}</Typography>
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>{formatCurrency(avgDay)}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='caption' color='text.secondary'>{text.highestDay}</Typography>
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>{maxDay.day} · {formatCurrency(maxDay.value)}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='caption' color='text.secondary'>{text.transactions}</Typography>
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>{filteredTransactions.length}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Stack spacing={3}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant='h6' sx={{ fontWeight: 800 }}>{text.quickActions}</Typography>
                  <Typography variant='body2' color='text.secondary'>{text.quickSend}</Typography>
                </Box>
              </Box>
              <Stack spacing={1.25}>
                {quickActions.map(action => (
                  <Button
                    key={action.label}
                    onClick={action.action}
                    variant='outlined'
                    sx={{ justifyContent: 'flex-start', borderRadius: 3, px: 2, py: 1.35, textTransform: 'none' }}
                    startIcon={<Box sx={{ width: 32, height: 32, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: action.bg, color: action.color }}><action.icon className='h-4 w-4' /></Box>}
                  >
                    {action.label}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant='h6' sx={{ fontWeight: 800 }}>{text.myCards}</Typography>
                  <Typography variant='body2' color='text.secondary'>{cards.length ? `${cards.length} ${text.active}` : text.noCardsYet}</Typography>
                </Box>
                <Stack direction='row' spacing={1}>
                  <Button size='small' variant='outlined' onClick={() => setCardIndex(index => Math.max(index - 1, 0))} disabled={cardIndex === 0}>
                    <ChevronLeft className='h-4 w-4' />
                  </Button>
                  <Button size='small' variant='outlined' onClick={() => setCardIndex(index => Math.min(index + 1, Math.max(cards.length - 1, 0)))} disabled={cardIndex >= cards.length - 1}>
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </Stack>
              </Box>
              {visibleCard ? (
                <Box sx={{ borderRadius: 4, p: 2.5, color: 'common.white', position: 'relative', overflow: 'hidden', background: visibleCard.brand === 'VISA' ? 'linear-gradient(135deg, #e8611a, #ff9a4d)' : visibleCard.brand === 'MASTERCARD' ? 'linear-gradient(135deg, #111827, #374151)' : visibleCard.brand === 'ELO' ? 'linear-gradient(135deg, #ca8a04, #f59e0b)' : 'linear-gradient(135deg, #1d4ed8, #60a5fa)' }}>
                  <Box sx={{ position: 'absolute', top: -24, right: -24, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.14)' }} />
                  <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.72)' }}>{visibleCard.cardType} Card</Typography>
                  <Typography variant='body1' sx={{ fontWeight: 800, mt: 0.5 }}>{visibleCard.brand}</Typography>
                  <Typography variant='h6' sx={{ fontFamily: 'monospace', letterSpacing: 1.5, mt: 3 }}>
                    •••• •••• •••• {visibleCard.lastFour}
                  </Typography>
                  <Stack direction='row' spacing={2} sx={{ mt: 3, justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.7)' }}>Holder</Typography>
                      <Typography variant='body2' sx={{ fontWeight: 700 }}>{visibleCard.holderName}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.7)' }}>Expires</Typography>
                      <Typography variant='body2' sx={{ fontWeight: 700 }}>{String(visibleCard.expiryMonth).padStart(2, '0')}/{visibleCard.expiryYear}</Typography>
                    </Box>
                  </Stack>
                </Box>
              ) : (
                <Typography variant='body2' color='text.secondary'>{text.noCardsYet}</Typography>
              )}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant='h6' sx={{ fontWeight: 800, mb: 1 }}>{text.portfolio}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {activeInvestments.length ? `${activeInvestments.length} ${text.activeInvestments}` : text.noInvestments}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List disablePadding>
                {activeInvestments.slice(0, 3).map(investment => (
                  <ListItem key={investment.id} disableGutters sx={{ py: 1 }}>
                    <ListItemAvatar>
                      <Box sx={{ width: 38, height: 38, borderRadius: 3, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'primary.main' }}>
                        <TrendingUp className='h-4 w-4' />
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={investment.investmentType.replace('_', ' ')}
                      secondary={formatDate(investment.investedAt)}
                    />
                    <Typography variant='body2' sx={{ fontWeight: 800 }}>{formatCurrency(investment.currentValue)}</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>{text.recentTransactions}</Typography>
              <Typography variant='body2' color='text.secondary'>{text.seeAll}</Typography>
            </Box>
            <Button variant='text' onClick={() => navigate('/history')}>{text.seeAll}</Button>
          </Box>
          {transactions.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ py: 4, textAlign: 'center' }}>
              {text.noTransactionsYet}
            </Typography>
          ) : (
            <List disablePadding>
              {transactions.slice(0, 6).map(transaction => (
                <ListItem key={transaction.id} disableGutters sx={{ py: 1.2 }}>
                  <ListItemAvatar>
                    <Box sx={{ width: 42, height: 42, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: transaction.type === 'DEPOSIT' ? '#f0fdf4' : transaction.type === 'WITHDRAWAL' ? '#fef2f2' : '#eff6ff', color: transaction.type === 'DEPOSIT' ? '#16a34a' : transaction.type === 'WITHDRAWAL' ? '#dc2626' : '#2563eb' }}>
                      {transaction.type === 'DEPOSIT' ? <TrendingUp className='h-5 w-5' /> : transaction.type === 'WITHDRAWAL' ? <TrendingDown className='h-5 w-5' /> : <ArrowLeftRight className='h-5 w-5' />}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={transaction.description || transaction.type}
                    secondary={formatDate(transaction.createdAt)}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Typography variant='body2' sx={{ fontWeight: 800, color: transaction.type === 'DEPOSIT' ? 'success.main' : 'error.main' }}>
                      {transaction.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Typography>
                    <Chip
                      size='small'
                      label={transaction.status === 'COMPLETED' ? text.completed : transaction.status === 'FAILED' ? text.failed : text.pending}
                      variant='outlined'
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
