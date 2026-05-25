import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Chip, Divider, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { Search, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { accountApi } from '../api/account';
import { formatCurrency, formatDate, getTransactionLabel } from '../utils/formatters';
import { useI18n } from '../i18n/I18nContext';

export default function HistoryPage() {
  const { locale } = useI18n();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const text = locale === 'fr'
    ? {
        title: 'Historique des transactions',
        subtitle: 'Toute votre activite financiere',
        searchPlaceholder: 'Rechercher des transactions...',
        all: 'Toutes',
        deposits: 'Depots',
        withdrawals: 'Retraits',
        transfers: 'Virements',
        noTransactions: 'Aucune transaction trouvee',
        completed: 'Terminee',
        failed: 'Echouee',
        pending: 'En attente',
      }
    : {
        title: 'Transaction History',
        subtitle: 'All your financial activity',
        searchPlaceholder: 'Search transactions...',
        all: 'All',
        deposits: 'Deposits',
        withdrawals: 'Withdrawals',
        transfers: 'Transfers',
        noTransactions: 'No transactions found',
        completed: 'Completed',
        failed: 'Failed',
        pending: 'Pending',
      };

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: accountApi.getHistory,
  });

  const filtered = transactions.filter(transaction => {
    const matchType = filter === 'ALL' || transaction.type === filter;
    const matchSearch = !search ||
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
      <Card
        sx={{
          borderRadius: 5,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(232,97,26,0.12), rgba(255,255,255,0.98))',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant='overline' sx={{ color: 'primary.main', letterSpacing: 3, fontWeight: 700 }}>
            Ledger
          </Typography>
          <Typography variant='h4' sx={{ fontWeight: 900, mt: 1 }}>
            {text.title}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1.25, maxWidth: 720, lineHeight: 1.8 }}>
            {text.subtitle}
          </Typography>

          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.searchPlaceholder}
            sx={{ mt: 3, maxWidth: 560 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search className='h-4 w-4' />
                  </InputAdornment>
                ),
              },
            }}
          />
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
            {filters.map(entry => (
              <Chip
                key={entry.key}
                label={entry.label}
                color={filter === entry.key ? 'primary' : 'default'}
                variant={filter === entry.key ? 'filled' : 'outlined'}
                onClick={() => setFilter(entry.key)}
                clickable
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3, display: 'grid', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(index => (
                <Box key={index} sx={{ height: 76, borderRadius: 3, bgcolor: 'action.hover', opacity: 0.7 }} />
              ))}
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Box sx={{ width: 64, height: 64, mx: 'auto', borderRadius: 4, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
                <Search className='h-7 w-7' />
              </Box>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                {text.noTransactions}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid' }}>
              {filtered.map((transaction, index) => (
                <Box key={transaction.id} sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ width: 46, height: 46, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: transaction.type === 'DEPOSIT' ? '#f0fdf4' : transaction.type === 'WITHDRAWAL' ? '#fef2f2' : '#eff6ff', color: transaction.type === 'DEPOSIT' ? '#16a34a' : transaction.type === 'WITHDRAWAL' ? '#dc2626' : '#2563eb' }}>
                      {transaction.type === 'DEPOSIT' ? <TrendingUp className='h-5 w-5' /> : transaction.type === 'WITHDRAWAL' ? <TrendingDown className='h-5 w-5' /> : <ArrowLeftRight className='h-5 w-5' />}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 800 }} noWrap>
                        {getTransactionLabel(transaction.type)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' noWrap>
                        {transaction.description || formatDate(transaction.createdAt)}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDate(transaction.createdAt)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 800, color: transaction.type === 'DEPOSIT' ? 'success.main' : 'error.main' }}>
                        {transaction.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </Typography>
                      <Chip
                        size='small'
                        label={transaction.status === 'COMPLETED' ? text.completed : transaction.status === 'FAILED' ? text.failed : text.pending}
                        variant='outlined'
                        sx={{ mt: 0.5 }}
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
