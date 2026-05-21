import { useQuery } from '@tanstack/react-query';
import { accountApi } from '../api/account';
import { formatCurrency } from '../utils/formatters';
import { TrendingUp, TrendingDown, ArrowLeftRight, DollarSign, Activity } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { useI18n } from '../i18n/I18nContext';

const COLORS = ['#e8611a', '#2d2d2d', '#f5a623'];

export default function AnalyticsPage() {
  const { locale } = useI18n();

  const text = locale === 'fr'
    ? {
        deposits: 'Depots',
        withdrawals: 'Retraits',
        transfers: 'Virements',
        totalDeposits: 'Total depots',
        totalWithdrawals: 'Total retraits',
        totalTransfers: 'Total virements',
        currentBalance: 'Solde actuel',
        netFlow: 'flux net',
        analytics: 'Analytique',
        overview: 'Votre vue financiere',
        totalTransactions: 'transactions au total',
        balanceEvolution: 'Evolution du solde',
        cumulativeOverTime: 'Solde cumule dans le temps',
        current: 'Actuel',
        balance: 'Solde',
        noTransactionData: 'Pas encore de donnees de transaction',
        distribution: 'Repartition',
        volumeByType: 'Volume par type',
        noDataYet: 'Pas encore de donnees',
        totalAmountByCategory: 'Montant total par categorie',
        keyMetrics: 'Indicateurs cles',
        highlights: 'Points forts de votre historique',
        largestDeposit: 'Plus grand depot',
        largestWithdrawal: 'Plus grand retrait',
        averageTransaction: 'Transaction moyenne',
        savingsRate: "Taux d'epargne",
      }
    : {
        deposits: 'Deposits',
        withdrawals: 'Withdrawals',
        transfers: 'Transfers',
        totalDeposits: 'Total Deposits',
        totalWithdrawals: 'Total Withdrawals',
        totalTransfers: 'Total Transfers',
        currentBalance: 'Current Balance',
        netFlow: 'net flow',
        analytics: 'Analytics',
        overview: 'Your financial overview',
        totalTransactions: 'total transactions',
        balanceEvolution: 'Balance Evolution',
        cumulativeOverTime: 'Cumulative balance over time',
        current: 'Current',
        balance: 'Balance',
        noTransactionData: 'No transaction data yet',
        distribution: 'Distribution',
        volumeByType: 'Volume by type',
        noDataYet: 'No data yet',
        totalAmountByCategory: 'Total amount per category',
        keyMetrics: 'Key Metrics',
        highlights: 'Highlights from your history',
        largestDeposit: 'Largest Deposit',
        largestWithdrawal: 'Largest Withdrawal',
        averageTransaction: 'Average Transaction',
        savingsRate: 'Savings Rate',
      };

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: accountApi.getMyAccount,
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: accountApi.getHistory,
  });

  const deposits     = transactions.filter(t => t.type === 'DEPOSIT');
  const withdrawals  = transactions.filter(t => t.type === 'WITHDRAWAL');
  const transfers    = transactions.filter(t => t.type === 'TRANSFER');

  const totalDeposits    = deposits.reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = withdrawals.reduce((s, t) => s + Number(t.amount), 0);
  const totalTransfers   = transfers.reduce((s, t) => s + Number(t.amount), 0);

  const maxDeposit    = deposits.length    ? Math.max(...deposits.map(t => Number(t.amount)))    : 0;
  const maxWithdrawal = withdrawals.length ? Math.max(...withdrawals.map(t => Number(t.amount))) : 0;
  const avgTransaction = transactions.length
    ? transactions.reduce((s, t) => s + Number(t.amount), 0) / transactions.length : 0;

  const pieData = [
    { name: text.deposits,    value: totalDeposits },
    { name: text.withdrawals, value: totalWithdrawals },
    { name: text.transfers,   value: totalTransfers },
  ].filter(d => d.value > 0);

  const barData = [
    { name: text.deposits,    value: totalDeposits,    count: deposits.length },
    { name: text.withdrawals, value: totalWithdrawals, count: withdrawals.length },
    { name: text.transfers,   value: totalTransfers,   count: transfers.length },
  ];

  const balanceEvolution = [...transactions]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce((acc, t, i) => {
      const prev = acc[i - 1]?.balance ?? (account?.balance || 0);
      const delta = t.type === 'DEPOSIT' ? Number(t.amount) : -Number(t.amount);
      const date = new Date(t.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit' });
      return [...acc, { date, balance: prev + delta }];
    }, [] as { date: string; balance: number }[]);

  const netFlow = totalDeposits - totalWithdrawals;
  const savingsRate = totalDeposits > 0 ? ((totalDeposits - totalWithdrawals) / totalDeposits) * 100 : 0;

  const stats = [
    {
      label: text.totalDeposits,
      value: formatCurrency(totalDeposits),
      sub: `${deposits.length} ${text.totalTransactions.replace('total ', '')}`,
      icon: TrendingUp,
      accent: '#16a34a',
      bg: '#f0fdf4',
    },
    {
      label: text.totalWithdrawals,
      value: formatCurrency(totalWithdrawals),
      sub: `${withdrawals.length} ${text.totalTransactions.replace('total ', '')}`,
      icon: TrendingDown,
      accent: '#dc2626',
      bg: '#fef2f2',
    },
    {
      label: text.totalTransfers,
      value: formatCurrency(totalTransfers),
      sub: `${transfers.length} ${text.totalTransactions.replace('total ', '')}`,
      icon: ArrowLeftRight,
      accent: '#2563eb',
      bg: '#eff6ff',
    },
    {
      label: text.currentBalance,
      value: formatCurrency(account?.balance || 0),
      sub: netFlow >= 0 ? `+${formatCurrency(netFlow)} ${text.netFlow}` : `${formatCurrency(netFlow)} ${text.netFlow}`,
      icon: DollarSign,
      accent: '#e8611a',
      bg: '#fff7ed',
    },
  ];

  if (isLoading) {
    return (
      <div className='space-y-6 animate-pulse'>
        <div className='grid grid-cols-4 gap-4'>
          {[1,2,3,4].map(i => <div key={i} className='card h-28 bg-cream-200' />)}
        </div>
        <div className='grid grid-cols-3 gap-6'>
          <div className='card col-span-2 h-72 bg-cream-200' />
          <div className='card h-72 bg-cream-200' />
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>

      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-dark-800'>{text.analytics}</h1>
          <p className='text-gray-400 text-sm mt-1'>{text.overview}</p>
        </div>
        <div className='flex items-center gap-2 bg-white border border-cream-200 rounded-xl px-4 py-2 text-sm text-gray-400'>
          <Activity className='w-4 h-4 text-primary-500' />
          <span>{transactions.length} {text.totalTransactions}</span>
        </div>
      </div>

      {/* Stats — 4 cards com subinfo */}
      <div className='grid grid-cols-4 gap-4'>
        {stats.map(({ label, value, sub, icon: Icon, accent, bg }) => (
          <div key={label} className='card p-5 flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <p className='text-xs font-medium text-gray-400 uppercase tracking-wide'>{label}</p>
              <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ background: bg }}>
                <Icon className='w-4 h-4' style={{ color: accent }} />
              </div>
            </div>
            <p className='text-xl font-bold text-dark-800 leading-tight'>{value}</p>
            <p className='text-xs text-gray-400'>{sub}</p>
          </div>
        ))}
      </div>

      {/* Balance Evolution + Pie */}
      <div className='grid grid-cols-3 gap-6'>

        {/* Area chart */}
        <div className='card p-6 col-span-2'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h3 className='font-semibold text-dark-800'>{text.balanceEvolution}</h3>
              <p className='text-xs text-gray-400 mt-0.5'>{text.cumulativeOverTime}</p>
            </div>
            {balanceEvolution.length > 0 && (
              <div className='text-right'>
                <p className='text-xs text-gray-400'>{text.current}</p>
                <p className='font-bold text-dark-800'>{formatCurrency(account?.balance || 0)}</p>
              </div>
            )}
          </div>
          {balanceEvolution.length > 0 ? (
            <ResponsiveContainer width='100%' height={200}>
              <AreaChart data={balanceEvolution}>
                <defs>
                  <linearGradient id='balGrad' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%'  stopColor='#e8611a' stopOpacity={0.15} />
                    <stop offset='95%' stopColor='#e8611a' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey='date' stroke='#e5e7eb' tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke='#e5e7eb' tick={{ fill: '#9ca3af', fontSize: 11 }} width={80}
                  tickFormatter={v => formatCurrency(v)} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(v) => [formatCurrency(Number(v)), text.balance]}
                />
                <Area type='monotone' dataKey='balance' stroke='#e8611a' strokeWidth={2.5} fill='url(#balGrad)' dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className='flex flex-col items-center justify-center h-48 text-gray-300 gap-2'>
              <Activity className='w-8 h-8' />
              <p className='text-sm'>{text.noTransactionData}</p>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className='card p-6 flex flex-col'>
          <div className='mb-4'>
            <h3 className='font-semibold text-dark-800'>{text.distribution}</h3>
            <p className='text-xs text-gray-400 mt-0.5'>{text.volumeByType}</p>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width='100%' height={160}>
                <PieChart>
                  <Pie data={pieData} cx='50%' cy='50%' innerRadius={48} outerRadius={72}
                    dataKey='value' paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className='space-y-3 mt-4'>
                {pieData.map((item, i) => {
                  const total = pieData.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={item.name} className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='w-2.5 h-2.5 rounded-full' style={{ background: COLORS[i] }} />
                        <span className='text-xs text-gray-500'>{item.name}</span>
                      </div>
                      <div className='text-right'>
                        <span className='text-xs font-semibold text-dark-800'>{formatCurrency(item.value)}</span>
                        <span className='text-xs text-gray-400 ml-1'>({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className='flex items-center justify-center flex-1 text-gray-300 text-sm'>{text.noDataYet}</div>
          )}
        </div>
      </div>

      {/* Bar chart + Key Metrics */}
      <div className='grid grid-cols-3 gap-6'>

        {/* Bar */}
        <div className='card p-6 col-span-2'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h3 className='font-semibold text-dark-800'>{text.volumeByType}</h3>
              <p className='text-xs text-gray-400 mt-0.5'>{text.totalAmountByCategory}</p>
            </div>
          </div>
          <ResponsiveContainer width='100%' height={200}>
            <BarChart data={barData} barSize={48}>
              <XAxis dataKey='name' stroke='#e5e7eb' tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis stroke='#e5e7eb' tick={{ fill: '#9ca3af', fontSize: 12 }} width={80}
                tickFormatter={v => formatCurrency(v)} />
              <Tooltip
                contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                formatter={(v, _n, props) => [formatCurrency(Number(v)), `${props.payload.count} ${text.totalTransactions.replace('total ', '')}`]}
              />
              <Bar dataKey='value' radius={[8, 8, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key metrics - redesigned */}
        <div className='card p-6 flex flex-col gap-4'>
          <div>
            <h3 className='font-semibold text-dark-800'>{text.keyMetrics}</h3>
            <p className='text-xs text-gray-400 mt-0.5'>{text.highlights}</p>
          </div>

          <div className='flex-1 space-y-3'>
            {[
              { label: text.totalTransactions, value: String(transactions.length), color: 'text-dark-800' },
              { label: text.largestDeposit,    value: formatCurrency(maxDeposit),    color: 'text-green-600' },
              { label: text.largestWithdrawal, value: formatCurrency(maxWithdrawal), color: 'text-red-500' },
              { label: text.averageTransaction, value: formatCurrency(avgTransaction), color: 'text-dark-800' },
              { label: text.savingsRate,        value: `${savingsRate.toFixed(1)}%`,   color: savingsRate >= 0 ? 'text-primary-500' : 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className='flex items-center justify-between py-2.5 border-b border-cream-200 last:border-0'>
                <p className='text-xs text-gray-400'>{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}