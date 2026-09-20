import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountApi } from '../../api/account';
import { investmentsApi } from '../../api/investments';
import { useAuth } from '../../hooks/useAuth';
import { Bell, TrendingUp, DollarSign, X, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { userRole, isAuthenticated } = useAuth();
  const isAdmin = userRole === 'ADMIN';
  const isUser = isAuthenticated && !isAdmin;

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: accountApi.getHistory,
    enabled: isUser,
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: investmentsApi.getMyInvestments,
    enabled: isUser,
  });

  const notifications = [
    {
      id: 'welcome',
      icon: Bell,
      color: 'bg-orange-500/10 text-orange-500',
      title: 'Welcome to FinBank!',
      description: 'Your account is active and ready to use.',
      time: 'Just now',
    },
    ...transactions.slice(0, 3).map((t) => ({
      id: t.id,
      icon: DollarSign,
      color:
        t.type === 'DEPOSIT'
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-rose-500/10 text-rose-500',
      title:
        t.type === 'DEPOSIT'
          ? 'Amount received'
          : t.type === 'WITHDRAWAL'
          ? 'Withdrawal made'
          : 'Transfer sent',
      description: `${t.type === 'DEPOSIT' ? '+' : '-'}${formatCurrency(t.amount)} ${
        t.description ? `- ${t.description}` : ''
      }`,
      time: formatDate(t.createdAt),
    })),
    ...investments
      .filter((i) => Number(i.profitLoss) > 0)
      .slice(0, 2)
      .map((i) => ({
        id: i.id,
        icon: TrendingUp,
        color: 'bg-emerald-500/10 text-emerald-500',
        title: `${i.investmentType.replace('_', ' ')} earning`,
        description: `Your investment is up ${formatCurrency(Number(i.profitLoss))} (${Number(
          i.profitLossPercent
        ).toFixed(2)}%)`,
        time: formatDate(i.investedAt),
      })),
  ].filter((n) => !dismissed.includes(n.id));

  const unreadCount = notifications.length;

  return (
    <div className='relative'>
      <button
        onClick={() => setOpen(!open)}
        aria-label='Notifications'
        className='relative w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 shadow-sm hover:border-primary-500 dark:hover:border-primary-500 transition-all'
      >
        <Bell className='w-4.5 h-4.5' />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div className='absolute right-0 top-12 w-80 sm:w-88 max-w-[calc(100vw-32px)] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
            {/* Popover Header */}
            <div className='flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800/80'>
              <h3 className='font-bold text-sm text-slate-900 dark:text-zinc-100'>Notifications</h3>
              <div className='flex items-center gap-2'>
                {notifications.length > 0 && (
                  <button
                    onClick={() =>
                      setDismissed((prev) => [...prev, ...notifications.map((n) => n.id)])
                    }
                    className='text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1'
                  >
                    <Check className='w-3 h-3' /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className='p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>

            {/* List */}
            <div className='max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60'>
              {notifications.length === 0 ? (
                <div className='p-8 text-center'>
                  <Bell className='w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2' />
                  <p className='text-slate-500 dark:text-zinc-400 text-xs font-medium'>
                    {isAdmin ? 'No security notifications' : 'No new notifications'}
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className='flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors'
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}
                    >
                      <n.icon className='w-4 h-4' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-slate-900 dark:text-zinc-100'>
                        {n.title}
                      </p>
                      <p className='text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5'>
                        {n.description}
                      </p>
                      <p className='text-[10px] text-slate-400 dark:text-zinc-500 mt-1 font-medium'>
                        {n.time}
                      </p>
                    </div>
                    <button
                      onClick={() => setDismissed((prev) => [...prev, n.id])}
                      className='text-slate-300 dark:text-zinc-600 hover:text-slate-500 dark:hover:text-zinc-400 shrink-0 p-1'
                      aria-label='Dismiss notification'
                    >
                      <X className='w-3.5 h-3.5' />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}