import { useQuery } from '@tanstack/react-query';
import { accountApi } from '../api/account';
import { formatCurrency, formatDate, getTransactionLabel } from '../utils/formatters';
import { TrendingUp, TrendingDown, ArrowLeftRight, Search } from 'lucide-react';
import { useState } from 'react';
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

  const filtered = transactions.filter(t => {
    const matchType = filter === 'ALL' || t.type === filter;
    const matchSearch = !search ||
      getTransactionLabel(t.type).toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.amount.toString().includes(search);
    return matchType && matchSearch;
  });

  const filters = [
    { key: 'ALL', label: text.all },
    { key: 'DEPOSIT', label: text.deposits },
    { key: 'WITHDRAWAL', label: text.withdrawals },
    { key: 'TRANSFER', label: text.transfers },
  ];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-dark-800'>{text.title}</h1>
        <p className='text-gray-400 text-sm mt-1'>{text.subtitle}</p>
      </div>

      {/* Search */}
      <div className='relative'>
        <label htmlFor='history-search' className='sr-only'>Search transactions</label>
        <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300' />
        <input id='history-search' name='search' type='text' value={search} onChange={e => setSearch(e.target.value)}
          className='w-full bg-white border border-cream-200 rounded-xl pl-11 pr-4 py-3 text-dark-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 transition-colors shadow-sm'
          placeholder={text.searchPlaceholder} />
      </div>

      {/* Filters */}
      <div className='flex gap-2'>
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-white text-gray-500 hover:text-primary-500 border border-cream-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className='card overflow-hidden'>
        {isLoading ? (
          <div className='p-6 space-y-4'>
            {[1,2,3,4,5].map(i => (
              <div key={i} className='flex items-center gap-3 animate-pulse'>
                <div className='w-10 h-10 rounded-full bg-cream-200' />
                <div className='flex-1'>
                  <div className='h-4 w-32 bg-cream-200 rounded mb-2' />
                  <div className='h-3 w-24 bg-cream-200 rounded' />
                </div>
                <div className='h-4 w-20 bg-cream-200 rounded' />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className='p-12 text-center'>
            <div className='w-16 h-16 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4'>
              <Search className='w-8 h-8 text-gray-300' />
            </div>
            <p className='text-gray-400'>{text.noTransactions}</p>
          </div>
        ) : (
          <div className='divide-y divide-cream-100'>
            {filtered.map(t => (
              <div key={t.id} className='flex items-center justify-between p-4 hover:bg-cream-50 transition-colors'>
                <div className='flex items-center gap-3'>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    t.type === 'DEPOSIT' ? 'bg-green-100' :
                    t.type === 'WITHDRAWAL' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {t.type === 'DEPOSIT' ? <TrendingUp className='w-5 h-5 text-green-500' /> :
                     t.type === 'WITHDRAWAL' ? <TrendingDown className='w-5 h-5 text-red-500' /> :
                     <ArrowLeftRight className='w-5 h-5 text-blue-500' />}
                  </div>
                  <div>
                    <p className='text-dark-800 text-sm font-medium'>{getTransactionLabel(t.type)}</p>
                    <p className='text-gray-400 text-xs mt-0.5'>
                      {t.description || formatDate(t.createdAt)}
                    </p>
                    <p className='text-gray-300 text-xs'>{formatDate(t.createdAt)}</p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className={`font-semibold text-sm ${
                    t.type === 'DEPOSIT' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {t.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                    t.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {t.status === 'COMPLETED' ? text.completed : t.status === 'FAILED' ? text.failed : text.pending}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}