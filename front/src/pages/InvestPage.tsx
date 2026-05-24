import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsApi } from '../api/investments';
import type { InvestmentType } from '../api/investments';
import { accountApi } from '../api/account';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TrendingUp, TrendingDown, Plus, Loader2, X, DollarSign, BarChart2, Percent, Clock } from 'lucide-react';

const investmentOptions: {
  type: InvestmentType; label: string; rate: string; rateNum: number;
  risk: string; color: string; bg: string; description: string;
}[] = [
  { type: 'CDB',           label: 'CDB',           rate: '12% p.a.',  rateNum: 12,   risk: 'Low',  color: '#2563eb', bg: '#eff6ff', description: 'Bank Deposit Certificate - safe and profitable' },
  { type: 'LCI',           label: 'LCI',           rate: '10% p.a.',  rateNum: 10,   risk: 'Low',  color: '#16a34a', bg: '#f0fdf4', description: 'Real Estate Credit Note - tax exempt' },
  { type: 'LCA',           label: 'LCA',           rate: '10.5% p.a.',rateNum: 10.5, risk: 'Low',  color: '#059669', bg: '#ecfdf5', description: 'Agribusiness Credit Note - tax exempt' },
  { type: 'TESOURO_DIRETO',label: 'Government Bonds',rate: '11% p.a.',  rateNum: 11,   risk: 'Low',  color: '#d97706', bg: '#fffbeb', description: 'Federal government bonds - maximum security' },
  { type: 'ACOES',         label: 'Stocks',        rate: '~15% p.a.', rateNum: 15,   risk: 'High', color: '#e8611a', bg: '#fff7ed', description: 'Variable income - higher return potential' },
];

export default function InvestPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<InvestmentType>('CDB');
  const [amount, setAmount] = useState('');

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: investmentsApi.getMyInvestments,
  });

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: accountApi.getMyAccount,
  });

  const investMutation = useMutation({
    mutationFn: () => investmentsApi.invest({ investmentType: selectedType, amount: parseFloat(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
      setShowForm(false);
      setAmount('');
    },
  });

  const redeemMutation = useMutation({
    mutationFn: investmentsApi.redeem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
  });

  const activeInvestments   = investments.filter(i => i.status === 'ACTIVE');
  const redeemedInvestments = investments.filter(i => i.status === 'REDEEMED');
  const totalInvested = activeInvestments.reduce((s, i) => s + Number(i.amount), 0);
  const totalCurrent  = activeInvestments.reduce((s, i) => s + Number(i.currentValue), 0);
  const totalProfit   = totalCurrent - totalInvested;
  const totalProfitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const selectedOption = investmentOptions.find(o => o.type === selectedType)!;

  return (
    <div className='grid grid-cols-3 gap-6'>

      {/* ── COLUNA PRINCIPAL (2/3) ── */}
      <div className='col-span-2 space-y-6'>

        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-dark-800'>Investments</h1>
            <p className='text-gray-400 text-sm mt-1'>Grow your money intelligently</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className='flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm'>
            <Plus className='w-4 h-4' /> Invest Now
          </button>
        </div>

        {/* Summary cards */}
        <div className='grid grid-cols-3 gap-4'>
          {[
            {
              label: 'Total Invested',
              value: formatCurrency(totalInvested),
              sub: `${activeInvestments.length} active positions`,
              icon: DollarSign,
              accent: '#2563eb', bg: '#eff6ff',
            },
            {
              label: 'Current Value',
              value: formatCurrency(totalCurrent),
              sub: totalInvested > 0 ? `${totalProfitPct >= 0 ? '+' : ''}${totalProfitPct.toFixed(2)}% total return` : 'No positions yet',
              icon: BarChart2,
              accent: '#e8611a', bg: '#fff7ed',
            },
            {
              label: 'Total Profit',
              value: `${totalProfit >= 0 ? '+' : ''}${formatCurrency(totalProfit)}`,
              sub: `${redeemedInvestments.length} redeemed`,
              icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
              accent: totalProfit >= 0 ? '#16a34a' : '#dc2626',
              bg:    totalProfit >= 0 ? '#f0fdf4'  : '#fef2f2',
            },
          ].map(({ label, value, sub, icon: Icon, accent, bg }) => (
            <div key={label} className='card p-5 flex flex-col gap-3'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-medium text-gray-400 uppercase tracking-wide'>{label}</p>
                <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ background: bg }}>
                  <Icon className='w-4 h-4' style={{ color: accent }} />
                </div>
              </div>
              <p className='text-xl font-bold text-dark-800 leading-tight' style={{ color: label === 'Total Profit' ? accent : undefined }}>
                {value}
              </p>
              <p className='text-xs text-gray-400'>{sub}</p>
            </div>
          ))}
        </div>

        {/* Active investments */}
        <div className='card p-6'>
          <div className='flex items-center justify-between mb-5'>
            <h3 className='font-semibold text-dark-800'>Active Investments</h3>
            {activeInvestments.length > 0 && (
              <span className='text-xs text-gray-400 bg-cream-100 px-2.5 py-1 rounded-full'>
                {activeInvestments.length} position{activeInvestments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className='space-y-3 animate-pulse'>
              {[1,2].map(i => <div key={i} className='h-20 bg-cream-200 rounded-xl' />)}
            </div>
          ) : activeInvestments.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='w-16 h-16 rounded-2xl bg-cream-100 flex items-center justify-center mb-4'>
                <TrendingUp className='w-8 h-8 text-gray-300' />
              </div>
              <p className='text-dark-800 font-medium mb-1'>No active investments</p>
              <p className='text-gray-400 text-sm mb-5'>Start investing to grow your money over time</p>
              <button onClick={() => setShowForm(true)}
                className='bg-primary-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-600 transition-all'>
                Invest Now
              </button>
            </div>
          ) : (
            <div className='space-y-3'>
              {activeInvestments.map(inv => {
                const opt = investmentOptions.find(o => o.type === inv.investmentType);
                const profit = Number(inv.profitLoss);
                const pct    = Number(inv.profitLossPercent);
                return (
                  <div key={inv.id} className='flex items-center justify-between p-4 rounded-xl border border-cream-200 hover:border-primary-200 hover:bg-primary-50/30 transition-all'>
                    <div className='flex items-center gap-3'>
                      <div className='w-11 h-11 rounded-xl flex items-center justify-center shrink-0'
                        style={{ background: opt?.bg || '#fff7ed' }}>
                        <TrendingUp className='w-5 h-5' style={{ color: opt?.color || '#e8611a' }} />
                      </div>
                      <div>
                        <p className='text-sm font-semibold text-dark-800'>{inv.investmentType.replace('_', ' ')}</p>
                        <p className='text-xs text-gray-400'>{inv.annualRate}% a.a. • {formatDate(inv.investedAt)}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-5'>
                      <div className='text-right'>
                        <p className='text-sm font-bold text-dark-800'>{formatCurrency(Number(inv.currentValue))}</p>
                        <p className={`text-xs font-medium ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({pct.toFixed(2)}%)
                        </p>
                      </div>
                      <button onClick={() => redeemMutation.mutate(inv.id)}
                        disabled={redeemMutation.isPending}
                        className='bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-xs px-3.5 py-2 rounded-lg transition-all font-medium'>
                        {redeemMutation.isPending ? <Loader2 className='w-3 h-3 animate-spin' /> : 'Redeem'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Redeemed */}
        {redeemedInvestments.length > 0 && (
          <div className='card p-6'>
            <h3 className='font-semibold text-dark-800 mb-4'>Redeemed Investments</h3>
            <div className='space-y-3'>
              {redeemedInvestments.map(inv => (
                <div key={inv.id} className='flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 opacity-70'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center'>
                      <TrendingUp className='w-5 h-5 text-gray-400' />
                    </div>
                    <div>
                      <p className='text-sm font-medium text-dark-800'>{inv.investmentType.replace('_', ' ')}</p>
                      <p className='text-xs text-gray-400'>
                        Redeemed{inv.redeemedAt ? ` • ${formatDate(inv.redeemedAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-bold text-dark-800'>{formatCurrency(Number(inv.currentValue))}</p>
                    <p className={`text-xs ${Number(inv.profitLoss) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Number(inv.profitLoss) >= 0 ? '+' : ''}{formatCurrency(Number(inv.profitLoss))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── COLUNA DIREITA (1/3) ── */}
      <div className='space-y-6'>

        {/* Available balance */}
        <div className='card p-6'>
          <p className='text-xs font-medium text-gray-400 uppercase tracking-wide mb-1'>Available to invest</p>
          <p className='text-2xl font-bold text-dark-800'>{formatCurrency(account?.balance || 0)}</p>
          <div className='mt-4 pt-4 border-t border-cream-200'>
            <button onClick={() => setShowForm(true)}
              className='w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-xl text-sm font-medium transition-all'>
              <Plus className='w-4 h-4' /> New Investment
            </button>
          </div>
        </div>

        {/* Investment options overview */}
        <div className='card p-6'>
          <h3 className='font-semibold text-dark-800 mb-4'>Available Products</h3>
          <div className='space-y-3'>
            {investmentOptions.map(opt => (
              <div key={opt.type} className='flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                  <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ background: opt.bg }}>
                    <TrendingUp className='w-4 h-4' style={{ color: opt.color }} />
                  </div>
                  <div>
                    <p className='text-sm font-medium text-dark-800'>{opt.label}</p>
                    <p className='text-xs text-gray-400'>{opt.risk} risk</p>
                  </div>
                </div>
                <span className='text-sm font-bold' style={{ color: opt.color }}>{opt.rate}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className='card p-6'>
          <h3 className='font-semibold text-dark-800 mb-4'>Quick Tips</h3>
          <div className='space-y-3'>
            {[
              { icon: Percent,  text: 'LCI & LCA are tax-exempt — great for long-term goals' },
              { icon: Clock,    text: 'The longer you invest, the more compound interest works for you' },
              { icon: BarChart2, text: 'Diversify across types to balance risk and return' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className='flex items-start gap-3'>
                <div className='w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5'>
                  <Icon className='w-3.5 h-3.5 text-primary-500' />
                </div>
                <p className='text-xs text-gray-500 leading-relaxed'>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {showForm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl'>
            <div className='flex items-center justify-between mb-5'>
              <div>
                <h2 className='text-lg font-bold text-dark-800'>New Investment</h2>
                <p className='text-xs text-gray-400 mt-0.5'>Choose a product and amount</p>
              </div>
              <button onClick={() => setShowForm(false)}
                className='w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center text-gray-400 hover:text-dark-800 transition-colors'>
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Balance */}
            <div className='bg-cream-100 rounded-xl p-3 mb-5 flex items-center justify-between'>
              <p className='text-xs text-gray-400'>Available Balance</p>
              <p className='text-sm font-bold text-dark-800'>{formatCurrency(account?.balance || 0)}</p>
            </div>

            {/* Options */}
            <div className='space-y-2 mb-5'>
              {investmentOptions.map(opt => (
                <button key={opt.type} onClick={() => setSelectedType(opt.type)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedType === opt.type
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-cream-200 hover:border-primary-200 hover:bg-cream-50'
                  }`}>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ background: opt.bg }}>
                      <TrendingUp className='w-4 h-4' style={{ color: opt.color }} />
                    </div>
                    <div className='text-left'>
                      <p className='text-sm font-medium text-dark-800'>{opt.label}</p>
                      <p className='text-xs text-gray-400'>{opt.description}</p>
                    </div>
                  </div>
                  <div className='text-right ml-4 shrink-0'>
                    <p className='text-sm font-bold text-primary-500'>{opt.rate}</p>
                    <p className={`text-xs ${opt.risk === 'High' ? 'text-red-400' : 'text-green-500'}`}>{opt.risk} risk</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Amount */}
            <label htmlFor='invest-amount' className='block text-xs font-medium text-dark-800 mb-2'>Amount to invest</label>
            <div className='relative mb-3'>
              <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium'>R$</span>
              <input id='invest-amount' name='amount' type='number' value={amount} onChange={e => setAmount(e.target.value)}
                className='w-full bg-cream-100 border border-cream-200 rounded-xl pl-10 pr-4 py-3 text-dark-800 focus:outline-none focus:border-primary-500 text-sm'
                placeholder='0,00' min='1' step='0.01' />
            </div>

            <div className='grid grid-cols-4 gap-2 mb-5'>
              {[100, 500, 1000, 5000].map(v => (
                <button key={v} onClick={() => setAmount(String(v))}
                  className='py-2 rounded-xl bg-cream-100 hover:bg-primary-50 hover:text-primary-500 text-gray-500 text-xs font-medium transition-all border border-cream-200'>
                  {formatCurrency(v)}
                </button>
              ))}
            </div>

            {/* Estimated return */}
            {amount && parseFloat(amount) > 0 && (
              <div className='bg-green-50 border border-green-100 rounded-xl p-3 mb-4 flex items-center justify-between'>
                <p className='text-xs text-green-700'>Est. return in 12 months ({selectedOption.rate})</p>
                <p className='text-sm font-bold text-green-600'>
                  +{formatCurrency(parseFloat(amount) * (selectedOption.rateNum / 100))}
                </p>
              </div>
            )}

            <button onClick={() => investMutation.mutate()} disabled={investMutation.isPending || !amount}
              className='w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2'>
              {investMutation.isPending
                ? <Loader2 className='w-5 h-5 animate-spin' />
                : <><TrendingUp className='w-4 h-4' /> Invest Now</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}