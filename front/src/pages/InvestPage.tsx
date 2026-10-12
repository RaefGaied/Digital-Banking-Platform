import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsApi } from '../api/investments';
import type { InvestmentType } from '../api/investments';
import { accountApi } from '../api/account';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  X,
  DollarSign,
  BarChart2,
  Percent,
  Clock,
  Sparkles,
  ShieldCheck,
  Calculator,
  Flame,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/context';
import { useTheme } from '../theme/context';

interface InvestmentOption {
  type: InvestmentType;
  label: string;
  rate: string;
  rateNum: number;
  risk: 'Ultra Low' | 'Low' | 'Medium' | 'High';
  color: string;
  bg: string;
  border: string;
  description: string;
  taxFree?: boolean;
}

const investmentOptions: InvestmentOption[] = [
  {
    type: 'CDB',
    label: 'CDB Bank Deposit',
    rate: '12.0% p.a.',
    rateNum: 12.0,
    risk: 'Low',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'border-blue-500/30',
    description: 'Bank Deposit Certificate — 100% principal guarantee with daily liquidity',
  },
  {
    type: 'LCI',
    label: 'LCI Real Estate Note',
    rate: '10.2% p.a.',
    rateNum: 10.2,
    risk: 'Low',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'border-emerald-500/30',
    description: 'Prime Real Estate Note — 100% exempt from income taxes',
    taxFree: true,
  },
  {
    type: 'LCA',
    label: 'LCA Agribusiness Note',
    rate: '10.8% p.a.',
    rateNum: 10.8,
    risk: 'Low',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
    border: 'border-emerald-600/30',
    description: 'Sustained Agribusiness Credit — tax-free sovereign agriculture backing',
    taxFree: true,
  },
  {
    type: 'TESOURO_DIRETO',
    label: 'Treasury Direct Bonds',
    rate: '11.5% p.a.',
    rateNum: 11.5,
    risk: 'Ultra Low',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    border: 'border-amber-500/30',
    description: 'Federal Sovereign Debt — maximum institutional risk clearance',
  },
  {
    type: 'ACOES',
    label: 'Global Equities Basket',
    rate: '~16.4% p.a.',
    rateNum: 16.4,
    risk: 'High',
    color: '#e8611a',
    bg: 'rgba(232, 97, 26, 0.1)',
    border: 'border-orange-500/30',
    description: 'High-growth tech & blue-chip dividend index for long-term compound wealth',
  },
];

const liveTickers = [
  { symbol: 'S&P 500', price: '5,864.20', change: '+0.82%', up: true },
  { symbol: 'NASDAQ', price: '18,518.61', change: '+1.14%', up: true },
  { symbol: 'GOLD (XAU)', price: '$2,652.40', change: '+0.45%', up: true },
  { symbol: 'BTC/USD', price: '$91,840.00', change: '+3.28%', up: true },
  { symbol: 'EUR/USD', price: '1.0842', change: '-0.12%', up: false },
  { symbol: 'US 10Y BOND', price: '4.18%', change: '-0.04%', up: false },
];

export default function InvestPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, userRole } = useAuth();
  const { locale } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const canLoadInvestments = isAuthenticated && userRole === 'USER';

  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<InvestmentType>('CDB');
  const [amount, setAmount] = useState('');

  // Compound Calculator State
  const [calcPrincipal, setCalcPrincipal] = useState<number>(5000);
  const [calcMonthly, setCalcMonthly] = useState<number>(500);
  const [calcMonths, setCalcMonths] = useState<number>(24);
  const [calcAsset, setCalcAsset] = useState<InvestmentType>('CDB');

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: investmentsApi.getMyInvestments,
    enabled: canLoadInvestments,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: accountApi.getMyAccount,
    enabled: canLoadInvestments,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const investMutation = useMutation({
    mutationFn: () =>
      investmentsApi.invest({ investmentType: selectedType, amount: parseFloat(amount) }),
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

  const activeInvestments = investments.filter((i) => i.status === 'ACTIVE');
  const redeemedInvestments = investments.filter((i) => i.status === 'REDEEMED');
  const totalInvested = activeInvestments.reduce((s, i) => s + Number(i.amount), 0);
  const totalCurrent = activeInvestments.reduce((s, i) => s + Number(i.currentValue), 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalProfitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const selectedOption = investmentOptions.find((o) => o.type === selectedType)!;
  const calcOption = investmentOptions.find((o) => o.type === calcAsset) || investmentOptions[0];

  // Compound Interest Calculation
  const projectionData = useMemo(() => {
    const monthlyRate = calcOption.rateNum / 100 / 12;
    const points = [];
    let currentBalance = calcPrincipal;
    let totalDeposited = calcPrincipal;

    // Step every 3 months or per month if <= 12
    const step = calcMonths <= 12 ? 1 : Math.max(1, Math.floor(calcMonths / 8));

    points.push({
      month: 'Start',
      balance: Math.round(currentBalance),
      principal: Math.round(totalDeposited),
      interest: 0,
    });

    for (let m = 1; m <= calcMonths; m++) {
      currentBalance = (currentBalance + calcMonthly) * (1 + monthlyRate);
      totalDeposited += calcMonthly;

      if (m % step === 0 || m === calcMonths) {
        points.push({
          month: `${m}mo`,
          balance: Math.round(currentBalance),
          principal: Math.round(totalDeposited),
          interest: Math.max(0, Math.round(currentBalance - totalDeposited)),
        });
      }
    }

    return {
      points,
      finalBalance: currentBalance,
      finalPrincipal: totalDeposited,
      finalInterest: currentBalance - totalDeposited,
      estimatedMonthlyYield: (currentBalance * (calcOption.rateNum / 100)) / 12,
    };
  }, [calcPrincipal, calcMonthly, calcMonths, calcOption]);

  if (!canLoadInvestments) {
    return (
      <div className='card p-6'>
        <h1 className='text-2xl font-bold text-slate-900 dark:text-zinc-100'>Investments</h1>
        <p className='text-slate-500 dark:text-zinc-400 text-sm mt-1'>
          Investment tools are available for authenticated user accounts only.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* ── TOP LIVE TICKER STRIP ── */}
      <div className='card py-2.5 px-4 overflow-x-auto no-scrollbar border-primary-500/20 bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white shadow-sm'>
        <div className='flex items-center gap-6 min-w-max text-xs'>
          <div className='flex items-center gap-2 font-bold text-primary-400 uppercase tracking-wider text-[11px]'>
            <Flame className='w-3.5 h-3.5 text-orange-500 animate-pulse' />
            <span>Market Radar</span>
          </div>
          <div className='h-3 w-px bg-white/10' />
          {liveTickers.map((t) => (
            <div key={t.symbol} className='flex items-center gap-2'>
              <span className='font-bold text-slate-300'>{t.symbol}</span>
              <span className='font-mono font-semibold text-white'>{t.price}</span>
              <span
                className={`font-semibold text-[11px] px-1.5 py-0.5 rounded ${
                  t.up ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {t.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN TWO-COLUMN / THREE-COLUMN GRID ── */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* ── LEFT 2 COLUMNS ── */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Header */}
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <div className='flex items-center gap-2.5'>
                <h1 className='text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight'>
                  {locale === 'fr' ? 'Portefeuille d’Investissement' : 'Wealth & Investments'}
                </h1>
                <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-primary-500 border border-orange-500/20'>
                  PRO YIELD
                </span>
              </div>
              <p className='text-slate-500 dark:text-zinc-400 text-sm mt-1'>
                {locale === 'fr'
                  ? 'Faites fructifier votre capital avec des rendements institutionnels garantis'
                  : 'High-yield fixed income, tax-exempt notes, and institutional growth products'}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className='flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95'
            >
              <Plus className='w-4 h-4' />{' '}
              {locale === 'fr' ? 'Nouvel Investissement' : 'Invest Capital'}
            </button>
          </div>

          {/* 3 Summary Stats Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            {[
              {
                label: locale === 'fr' ? 'Capital Investi' : 'Total Invested',
                value: formatCurrency(totalInvested),
                sub: `${activeInvestments.length} ${
                  locale === 'fr' ? 'positions actives' : 'active positions'
                }`,
                icon: DollarSign,
                accent: '#3b82f6',
                bg: 'rgba(59, 130, 246, 0.1)',
              },
              {
                label: locale === 'fr' ? 'Valorisation Actuelle' : 'Current Valuation',
                value: formatCurrency(totalCurrent),
                sub:
                  totalInvested > 0
                    ? `${totalProfitPct >= 0 ? '+' : ''}${totalProfitPct.toFixed(2)}% net yield`
                    : locale === 'fr'
                    ? 'Aucune position'
                    : 'No active positions yet',
                icon: BarChart2,
                accent: '#e8611a',
                bg: 'rgba(232, 97, 26, 0.1)',
              },
              {
                label: locale === 'fr' ? 'Plus-Value Nette' : 'Net Total Profit',
                value: `${totalProfit >= 0 ? '+' : ''}${formatCurrency(totalProfit)}`,
                sub: `${redeemedInvestments.length} ${
                  locale === 'fr' ? 'positions clôturées' : 'redeemed'
                }`,
                icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
                accent: totalProfit >= 0 ? '#10b981' : '#ef4444',
                bg: totalProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              },
            ].map(({ label, value, sub, icon: Icon, accent, bg }) => (
              <div key={label} className='card p-5 flex flex-col gap-3 card-hover'>
                <div className='flex items-center justify-between'>
                  <p className='text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider'>
                    {label}
                  </p>
                  <div
                    className='w-9 h-9 rounded-xl flex items-center justify-center'
                    style={{ background: bg }}
                  >
                    <Icon className='w-4.5 h-4.5' style={{ color: accent }} />
                  </div>
                </div>
                <p
                  className='text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-none'
                  style={{ color: label.includes('Profit') || label.includes('Plus-Value') ? accent : undefined }}
                >
                  {value}
                </p>
                <p className='text-xs text-slate-500 dark:text-zinc-400 font-medium'>{sub}</p>
              </div>
            ))}
          </div>

          {/* ── INTERACTIVE WEALTH & COMPOUND CALCULATOR ── */}
          <div className='card p-6 sm:p-7 border-2 border-orange-500/20 shadow-xl relative overflow-hidden'>
            <div className='flex flex-wrap items-center justify-between gap-3 mb-6'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md'>
                  <Calculator className='w-5 h-5' />
                </div>
                <div>
                  <h3 className='text-base sm:text-lg font-extrabold text-slate-900 dark:text-zinc-100'>
                    {locale === 'fr'
                      ? 'Simulateur d’Intérêts Composés'
                      : 'Interactive Compound Yield Simulator'}
                  </h3>
                  <p className='text-xs text-slate-500 dark:text-zinc-400'>
                    {locale === 'fr'
                      ? 'Projetez l’accumulation de votre patrimoine dans le temps'
                      : 'Simulate exponential wealth accumulation with monthly recurring contributions'}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-bold text-slate-500 dark:text-zinc-400'>
                  {locale === 'fr' ? 'Produit :' : 'Asset :'}
                </span>
                <select
                  value={calcAsset}
                  onChange={(e) => setCalcAsset(e.target.value as InvestmentType)}
                  className='text-xs font-bold bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-primary-500'
                >
                  {investmentOptions.map((o) => (
                    <option key={o.type} value={o.type}>
                      {o.label} ({o.rate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slider Controls */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6 p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800'>
              {/* Initial Amount */}
              <div>
                <div className='flex items-center justify-between text-xs font-bold mb-1.5'>
                  <span className='text-slate-500 dark:text-zinc-400'>
                    {locale === 'fr' ? 'Apport Initial' : 'Initial Principal'}
                  </span>
                  <span className='text-primary-500 font-mono text-sm'>
                    {formatCurrency(calcPrincipal)}
                  </span>
                </div>
                <input
                  type='range'
                  min='500'
                  max='50000'
                  step='500'
                  value={calcPrincipal}
                  onChange={(e) => setCalcPrincipal(Number(e.target.value))}
                  className='w-full accent-orange-500 cursor-pointer h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg'
                />
                <div className='flex justify-between text-[10px] text-slate-400 mt-1 font-mono'>
                  <span>$500</span>
                  <span>$50,000</span>
                </div>
              </div>

              {/* Monthly Contribution */}
              <div>
                <div className='flex items-center justify-between text-xs font-bold mb-1.5'>
                  <span className='text-slate-500 dark:text-zinc-400'>
                    {locale === 'fr' ? 'Versement Mensuel' : 'Monthly Addition'}
                  </span>
                  <span className='text-emerald-500 font-mono text-sm'>
                    {formatCurrency(calcMonthly)}/mo
                  </span>
                </div>
                <input
                  type='range'
                  min='0'
                  max='5000'
                  step='50'
                  value={calcMonthly}
                  onChange={(e) => setCalcMonthly(Number(e.target.value))}
                  className='w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg'
                />
                <div className='flex justify-between text-[10px] text-slate-400 mt-1 font-mono'>
                  <span>$0</span>
                  <span>$5,000/mo</span>
                </div>
              </div>

              {/* Duration Months */}
              <div>
                <div className='flex items-center justify-between text-xs font-bold mb-1.5'>
                  <span className='text-slate-500 dark:text-zinc-400'>
                    {locale === 'fr' ? 'Horizon Temporel' : 'Time Horizon'}
                  </span>
                  <span className='text-amber-500 font-mono text-sm'>
                    {calcMonths} {locale === 'fr' ? 'mois' : 'months'} (
                    {(calcMonths / 12).toFixed(1)} yrs)
                  </span>
                </div>
                <input
                  type='range'
                  min='6'
                  max='60'
                  step='6'
                  value={calcMonths}
                  onChange={(e) => setCalcMonths(Number(e.target.value))}
                  className='w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg'
                />
                <div className='flex justify-between text-[10px] text-slate-400 mt-1 font-mono'>
                  <span>6 mo</span>
                  <span>5 years</span>
                </div>
              </div>
            </div>

            {/* Projection Highlights Ribbon */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6'>
              <div className='p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700'>
                <p className='text-[10px] uppercase font-bold text-slate-400 tracking-wider'>
                  {locale === 'fr' ? 'Total Déposé' : 'Principal Contributed'}
                </p>
                <p className='text-base font-extrabold text-slate-800 dark:text-zinc-200 font-mono mt-0.5'>
                  {formatCurrency(projectionData.finalPrincipal)}
                </p>
              </div>

              <div className='p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50'>
                <p className='text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider'>
                  {locale === 'fr' ? 'Intérêts Générés' : 'Compound Interest'}
                </p>
                <p className='text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5'>
                  +{formatCurrency(projectionData.finalInterest)}
                </p>
              </div>

              <div className='p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20'>
                <p className='text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 tracking-wider'>
                  {locale === 'fr' ? 'Patrimoine Final' : 'Projected Wealth'}
                </p>
                <p className='text-base font-extrabold text-slate-900 dark:text-zinc-100 font-mono mt-0.5'>
                  {formatCurrency(projectionData.finalBalance)}
                </p>
              </div>

              <div className='p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50'>
                <p className='text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider'>
                  {locale === 'fr' ? 'Rente Mensuelle' : 'Monthly Dividend'}
                </p>
                <p className='text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-0.5'>
                  ~{formatCurrency(projectionData.estimatedMonthlyYield)}/mo
                </p>
              </div>
            </div>

            {/* Projection Area Chart */}
            <div className='h-52 w-full'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                  data={projectionData.points}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id='wealthGrad' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#e8611a' stopOpacity={0.4} />
                      <stop offset='95%' stopColor='#e8611a' stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id='principalGrad' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#3b82f6' stopOpacity={0.2} />
                      <stop offset='95%' stopColor='#3b82f6' stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey='month'
                    stroke={isDark ? '#52525b' : '#cbd5e1'}
                    tick={{ fill: isDark ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    stroke={isDark ? '#52525b' : '#cbd5e1'}
                    tick={{ fill: isDark ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                    width={70}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: isDark ? '#18181b' : '#ffffff',
                      border: `1px solid ${isDark ? '#3f3f46' : '#e2e8f0'}`,
                      borderRadius: 14,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    }}
                    formatter={(v, name) => [
                      formatCurrency(Number(v)),
                      name === 'balance' ? 'Projected Total' : 'Contributed Principal',
                    ]}
                  />
                  <Area
                    type='monotone'
                    dataKey='principal'
                    stroke='#3b82f6'
                    strokeWidth={1.5}
                    strokeDasharray='4 4'
                    fill='url(#principalGrad)'
                  />
                  <Area
                    type='monotone'
                    dataKey='balance'
                    stroke='#e8611a'
                    strokeWidth={3}
                    fill='url(#wealthGrad)'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Investments List */}
          <div className='card p-6 sm:p-7'>
            <div className='flex items-center justify-between mb-5'>
              <div>
                <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-base sm:text-lg'>
                  {locale === 'fr' ? 'Positions Détenues' : 'Your Active Positions'}
                </h3>
                <p className='text-xs text-slate-400 dark:text-zinc-500'>
                  {locale === 'fr'
                    ? 'Rendement cumulé en temps réel et options de rachat instantané'
                    : 'Real-time accrued valuation with instant liquidity liquidation'}
                </p>
              </div>
              {activeInvestments.length > 0 && (
                <span className='text-xs font-semibold text-primary-500 bg-orange-500/10 px-3 py-1 rounded-full'>
                  {activeInvestments.length} active
                </span>
              )}
            </div>

            {isLoading ? (
              <div className='space-y-3 animate-pulse'>
                {[1, 2].map((i) => (
                  <div key={i} className='h-20 bg-slate-100 dark:bg-zinc-800 rounded-2xl' />
                ))}
              </div>
            ) : activeInvestments.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center mb-3.5 text-primary-500'>
                  <PiggyBank className='w-8 h-8' />
                </div>
                <p className='text-slate-900 dark:text-zinc-100 font-bold mb-1'>
                  {locale === 'fr' ? 'Aucun investissement actif' : 'No active investments yet'}
                </p>
                <p className='text-slate-500 dark:text-zinc-400 text-xs max-w-sm mb-5 leading-relaxed'>
                  {locale === 'fr'
                    ? 'Démarrez dès 100 $ dans un dépôt garanti CDB ou des obligations souveraines pour générer des intérêts passifs.'
                    : 'Allocate capital into guaranteed bank certificates or sovereign debt starting at just $100.'}
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className='bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95'
                >
                  {locale === 'fr' ? 'Effectuer un premier placement' : 'Make First Investment'}
                </button>
              </div>
            ) : (
              <div className='space-y-3'>
                {activeInvestments.map((inv) => {
                  const opt = investmentOptions.find((o) => o.type === inv.investmentType);
                  const profit = Number(inv.profitLoss);
                  const pct = Number(inv.profitLossPercent);
                  return (
                    <div
                      key={inv.id}
                      className='flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 hover:border-primary-500/40 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-all group'
                    >
                      <div className='flex items-center gap-3.5 min-w-0'>
                        <div
                          className='w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105'
                          style={{ background: opt?.bg || 'rgba(232, 97, 26, 0.1)' }}
                        >
                          <TrendingUp
                            className='w-5 h-5'
                            style={{ color: opt?.color || '#e8611a' }}
                          />
                        </div>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <p className='text-sm font-bold text-slate-900 dark:text-zinc-100 truncate'>
                              {opt?.label || inv.investmentType.replace('_', ' ')}
                            </p>
                            {opt?.taxFree && (
                              <span className='text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase'>
                                Tax Exempt
                              </span>
                            )}
                          </div>
                          <p className='text-xs text-slate-400 dark:text-zinc-500 font-medium'>
                            {inv.annualRate}% a.a. • Invested {formatDate(inv.investedAt)}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-4 ml-auto sm:ml-0'>
                        <div className='text-right'>
                          <p className='text-sm font-extrabold text-slate-900 dark:text-zinc-100 font-mono'>
                            {formatCurrency(Number(inv.currentValue))}
                          </p>
                          <p
                            className={`text-xs font-bold font-mono ${
                              profit >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {profit >= 0 ? '+' : ''}
                            {formatCurrency(profit)} ({pct.toFixed(2)}%)
                          </p>
                        </div>
                        <button
                          onClick={() => redeemMutation.mutate(inv.id)}
                          disabled={redeemMutation.isPending}
                          className='bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-zinc-300 text-xs px-3.5 py-2 rounded-xl transition-all font-bold border border-slate-200 dark:border-zinc-700 active:scale-95'
                        >
                          {redeemMutation.isPending ? (
                            <Loader2 className='w-3.5 h-3.5 animate-spin' />
                          ) : (
                            'Redeem'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Redeemed Positions */}
          {redeemedInvestments.length > 0 && (
            <div className='card p-6 sm:p-7'>
              <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-base sm:text-lg mb-4'>
                {locale === 'fr' ? 'Positions Archivées' : 'Redeemed Historical Positions'}
              </h3>
              <div className='space-y-2.5'>
                {redeemedInvestments.map((inv) => (
                  <div
                    key={inv.id}
                    className='flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 opacity-80'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-700 flex items-center justify-center'>
                        <CheckCircle2 className='w-4.5 h-4.5 text-slate-500 dark:text-zinc-300' />
                      </div>
                      <div>
                        <p className='text-sm font-semibold text-slate-800 dark:text-zinc-200'>
                          {inv.investmentType.replace('_', ' ')}
                        </p>
                        <p className='text-xs text-slate-400 dark:text-zinc-500'>
                          Closed {inv.redeemedAt ? `• ${formatDate(inv.redeemedAt)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-bold text-slate-900 dark:text-zinc-100'>
                        {formatCurrency(Number(inv.currentValue))}
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          Number(inv.profitLoss) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {Number(inv.profitLoss) >= 0 ? '+' : ''}
                        {formatCurrency(Number(inv.profitLoss))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (1 COL) ── */}
        <div className='space-y-6'>
          {/* Available to Invest Card */}
          <div className='card p-6 bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white relative overflow-hidden shadow-xl'>
            <div className='absolute -right-8 -bottom-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none' />
            <p className='text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1'>
              {locale === 'fr' ? 'Liquidités Disponibles' : 'Available Capital to Allocate'}
            </p>
            <p className='text-3xl font-extrabold text-white tracking-tight font-mono'>
              {formatCurrency(account?.balance || 0)}
            </p>
            <p className='text-xs text-zinc-400 mt-1 flex items-center gap-1.5'>
              <ShieldCheck className='w-4 h-4 text-emerald-400' />
              <span>FDIC / Central Bank Protected</span>
            </p>
            <div className='mt-5 pt-4 border-t border-zinc-800'>
              <button
                onClick={() => setShowForm(true)}
                className='w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white py-3.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-orange-500/25 transition-all active:scale-95'
              >
                <Plus className='w-4 h-4' />{' '}
                {locale === 'fr' ? 'Allouer des Fonds' : 'Allocate Into Yield'}
              </button>
            </div>
          </div>

          {/* Available Products Card with Tax Free Badges */}
          <div className='card p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-sm uppercase tracking-wider'>
                {locale === 'fr' ? 'Catalogue de Produits' : 'Institutional Assets'}
              </h3>
              <span className='text-[10px] font-bold text-slate-400'>5 Products</span>
            </div>
            <div className='space-y-3'>
              {investmentOptions.map((opt) => (
                <div
                  key={opt.type}
                  onClick={() => {
                    setSelectedType(opt.type);
                    setShowForm(true);
                  }}
                  className='flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 hover:border-primary-500/40 hover:bg-slate-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-all group'
                >
                  <div className='flex items-center gap-3'>
                    <div
                      className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform'
                      style={{ background: opt.bg }}
                    >
                      <TrendingUp className='w-4.5 h-4.5' style={{ color: opt.color }} />
                    </div>
                    <div>
                      <div className='flex items-center gap-1.5'>
                        <p className='text-xs font-bold text-slate-800 dark:text-zinc-200'>
                          {opt.label}
                        </p>
                        {opt.taxFree && (
                          <span className='text-[9px] font-extrabold px-1 rounded bg-emerald-500/10 text-emerald-500'>
                            TAX-FREE
                          </span>
                        )}
                      </div>
                      <p className='text-[10px] text-slate-400 dark:text-zinc-500 font-medium'>
                        {opt.risk} Risk • Daily Liquidity
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <span className='text-xs font-extrabold font-mono' style={{ color: opt.color }}>
                      {opt.rate}
                    </span>
                    <ArrowUpRight className='w-3.5 h-3.5 text-slate-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity' />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Wealth Tips */}
          <div className='card p-6'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-sm uppercase tracking-wider mb-4'>
              {locale === 'fr' ? 'Conseils de Gestion' : 'Private Wealth Insights'}
            </h3>
            <div className='space-y-3'>
              {[
                {
                  icon: Percent,
                  text: 'LCI & LCA are 100% tax-free — optimal vehicle for compound compounding.',
                },
                {
                  icon: Landmark,
                  text: 'Treasury bonds offer sovereign-backed safety during periods of market volatility.',
                },
                {
                  icon: Clock,
                  text: 'Reinvest yields automatically to maximize long-term exponential interest.',
                },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className='flex items-start gap-2.5'>
                  <div className='w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5'>
                    <Icon className='w-3.5 h-3.5 text-primary-500' />
                  </div>
                  <p className='text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-medium'>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── INVESTMENT MODAL ── */}
      {showForm && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center justify-between mb-5'>
              <div>
                <h2 className='text-lg font-bold text-slate-900 dark:text-zinc-100'>
                  {locale === 'fr' ? 'Souscrire un Placement' : 'New Yield Allocation'}
                </h2>
                <p className='text-xs text-slate-400 dark:text-zinc-500 mt-0.5'>
                  {locale === 'fr'
                    ? 'Sélectionnez un actif et définissez le montant à investir'
                    : 'Select institutional product and set capital allocation'}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className='w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Available Capital Banner */}
            <div className='bg-slate-50 dark:bg-zinc-800/70 rounded-2xl p-3.5 mb-4 flex items-center justify-between border border-slate-200/60 dark:border-zinc-700/60'>
              <p className='text-xs text-slate-500 dark:text-zinc-400 font-semibold'>
                {locale === 'fr' ? 'Solde disponible' : 'Available Balance'}
              </p>
              <p className='text-sm font-extrabold text-slate-900 dark:text-zinc-100 font-mono'>
                {formatCurrency(account?.balance || 0)}
              </p>
            </div>

            {/* Product Selector */}
            <div className='space-y-2 mb-4 max-h-56 overflow-y-auto pr-1'>
              {investmentOptions.map((opt) => (
                <button
                  key={opt.type}
                  type='button'
                  onClick={() => setSelectedType(opt.type)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                    selectedType === opt.type
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className='flex items-center gap-3 text-left min-w-0'>
                    <div
                      className='w-8 h-8 rounded-xl flex items-center justify-center shrink-0'
                      style={{ background: opt.bg }}
                    >
                      <TrendingUp className='w-4 h-4' style={{ color: opt.color }} />
                    </div>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-1.5'>
                        <p className='text-xs font-bold text-slate-900 dark:text-zinc-100 truncate'>
                          {opt.label}
                        </p>
                        {opt.taxFree && (
                          <span className='text-[8px] font-bold px-1 rounded bg-emerald-500/10 text-emerald-500'>
                            TAX FREE
                          </span>
                        )}
                      </div>
                      <p className='text-[10px] text-slate-400 dark:text-zinc-500 truncate'>
                        {opt.description}
                      </p>
                    </div>
                  </div>
                  <div className='text-right ml-3 shrink-0'>
                    <p className='text-xs font-extrabold text-primary-500 font-mono'>{opt.rate}</p>
                    <p
                      className={`text-[10px] font-semibold ${
                        opt.risk === 'High' ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      {opt.risk}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Amount Input */}
            <label
              htmlFor='invest-amount'
              className='block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2'
            >
              {locale === 'fr' ? 'Montant à investir' : 'Amount to Allocate'}
            </label>
            <div className='relative mb-3'>
              <span className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-bold text-sm'>
                $
              </span>
              <input
                id='invest-amount'
                name='amount'
                type='number'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className='w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-slate-900 dark:text-zinc-100 text-base font-bold focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                placeholder='0.00'
                min='1'
                step='0.01'
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className='grid grid-cols-4 gap-2 mb-4'>
              {[250, 500, 1000, 5000].map((v) => (
                <button
                  key={v}
                  type='button'
                  onClick={() => setAmount(String(v))}
                  className='py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:border-primary-500 border border-transparent transition-all'
                >
                  {formatCurrency(v)}
                </button>
              ))}
            </div>

            {/* Return Estimation Box */}
            {amount && parseFloat(amount) > 0 && (
              <div className='bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 mb-4 flex items-center justify-between text-xs'>
                <span className='text-emerald-700 dark:text-emerald-300 font-medium'>
                  Estimated 12-month return ({selectedOption.rate})
                </span>
                <span className='font-bold text-emerald-600 dark:text-emerald-400 font-mono'>
                  +{formatCurrency(parseFloat(amount) * (selectedOption.rateNum / 100))}
                </span>
              </div>
            )}

            <button
              onClick={() => investMutation.mutate()}
              disabled={investMutation.isPending || !amount || parseFloat(amount) <= 0}
              className='w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-95'
            >
              {investMutation.isPending ? (
                <Loader2 className='w-5 h-5 animate-spin' />
              ) : (
                <>
                  <Sparkles className='w-4 h-4' />{' '}
                  {locale === 'fr' ? 'Confirmer le Placement' : 'Confirm Allocation'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}