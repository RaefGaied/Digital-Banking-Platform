import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Chip, Divider, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { Search, TrendingUp, TrendingDown, ArrowLeftRight, Sparkles } from 'lucide-react';
import { accountApi } from '../api/account';
import { formatCurrency, formatDate, getTransactionLabel } from '../utils/formatters';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';

export default function HistoryPage() {
  const { locale } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const text =
    locale === 'fr'
      ? {
          title: 'Historique des transactions',
          subtitle: 'Audit complet et recherche détaillée de votre activité financière',
          searchPlaceholder: 'Rechercher par description, montant ou type...',
          all: 'Toutes les transactions',
          deposits: 'Dépôts',
          withdrawals: 'Retraits',
          transfers: 'Virements',
          noTransactions: 'Aucune transaction trouvée correspondant à vos filtres.',
          completed: 'Terminée',
          failed: 'Échouée',
          pending: 'En attente',
        }
      : {
          title: 'Transaction History',
          subtitle: 'Complete verified ledger and search of your account activity',
          searchPlaceholder: 'Search transactions by description, type, or amount...',
          all: 'All Transactions',
          deposits: 'Deposits',
          withdrawals: 'Withdrawals',
          transfers: 'Transfers',
          noTransactions: 'No transactions found matching your criteria.',
          completed: 'Completed',
          failed: 'Failed',
          pending: 'Pending',
        };

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: accountApi.getHistory,
  });

  const filtered = transactions.filter((transaction) => {
    const matchType = filter === 'ALL' || transaction.type === filter;
    const matchSearch =
      !search ||
      getTransactionLabel(transaction.type).toLowerCase().includes(search.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(search.toLowerCase()) ||
      transaction.amount.toString().includes(search);
    return matchType && matchSearch;
  });

  const filters = [
    { key: 'ALL', label: text.all },
    { key: 'DEPOSIT', label: text.deposits },
    { key: 'WITHDRAWAL', label: text.withdrawals },
    { key: 'TRANSFER', label: text.transfers },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {/* ── HEADER BANNER ── */}
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
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Sparkles className='w-4 h-4 text-primary-500' />
            <Typography variant='overline' sx={{ color: 'primary.main', letterSpacing: 2, fontWeight: 700 }}>
              Verified Bank Ledger
            </Typography>
          </Stack>
          <Typography variant='h4' sx={{ fontWeight: 900, tracking: '-0.02em' }}>
            {text.title}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1, maxWidth: 680, lineHeight: 1.7 }}>
            {text.subtitle}
          </Typography>

          {/* Search Bar */}
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.searchPlaceholder}
            sx={{ mt: 3, maxWidth: 580 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search className='h-4 w-4 text-slate-400' />
                  </InputAdornment>
                ),
              },
            }}
          />
        </CardContent>
      </Card>

      {/* ── FILTER CHIPS ── */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {filters.map((entry) => (
              <Chip
                key={entry.key}
                label={entry.label}
                color={filter === entry.key ? 'primary' : 'default'}
                variant={filter === entry.key ? 'filled' : 'outlined'}
                onClick={() => setFilter(entry.key)}
                clickable
                sx={{ fontWeight: 700, fontSize: 13, py: 1 }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ── LEDGER LIST ── */}
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3, display: 'grid', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((index) => (
                <Box key={index} sx={{ height: 72, borderRadius: 3, bgcolor: 'action.hover', opacity: 0.6 }} />
              ))}
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  borderRadius: 4,
                  bgcolor: 'action.hover',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'text.secondary',
                }}
              >
                <Search className='h-7 w-7' />
              </Box>
              <Typography variant='body1' sx={{ fontWeight: 700, mt: 2 }}>
                {text.noTransactions}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                Try adjusting your search terms or selecting another transaction filter.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid' }}>
              {filtered.map((transaction, index) => (
                <Box key={transaction.id} sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 2.5, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
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
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 800, fontSize: { xs: 14, sm: 15 } }} noWrap>
                        {transaction.description || getTransactionLabel(transaction.type)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' noWrap sx={{ fontSize: 13, mt: 0.25 }}>
                        {getTransactionLabel(transaction.type)} • {formatDate(transaction.createdAt)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography
                        variant='subtitle1'
                        sx={{
                          fontWeight: 900,
                          color: transaction.type === 'DEPOSIT' ? 'success.main' : 'error.main',
                          fontSize: { xs: 14, sm: 16 },
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
                        sx={{ mt: 0.5, fontSize: 10, height: 20 }}
                      />
                    </Box>
                  </Box>
                  {index < filtered.length - 1 && <Divider sx={{ mt: 2.5 }} />}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
