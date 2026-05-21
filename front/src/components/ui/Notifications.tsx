import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountApi } from '../../api/account';
import { investmentsApi } from '../../api/investments';
import { Bell, TrendingUp, DollarSign, X, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: accountApi.getHistory,
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: investmentsApi.getMyInvestments,
  });

  const notifications = [
    {
      id: 'welcome',
      icon: Bell,
      color: 'bg-primary-100 text-primary-500',
      title: 'Welcome to FinBank!',
      description: 'Your account is active and ready to use.',
      time: 'Just now',
    },
    ...transactions.slice(0, 3).map(t => ({
      id: t.id,
      icon: DollarSign,
      color: t.type === 'DEPOSIT' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500',
      title: t.type === 'DEPOSIT' ? 'Amount received' : t.type === 'WITHDRAWAL' ? 'Withdrawal made' : 'Transfer sent',
      description: `${t.type === 'DEPOSIT' ? '+' : '-'}${formatCurrency(t.amount)} ${t.description ? `- ${t.description}` : ''}`,
      time: formatDate(t.createdAt),
    })),
    ...investments.filter(i => Number(i.profitLoss) > 0).slice(0, 2).map(i => ({
      id: i.id,
      icon: TrendingUp,
      color: 'bg-green-100 text-green-500',
      title: `${i.investmentType.replace('_', ' ')} earning`,
      description: `Your investment is up ${formatCurrency(Number(i.profitLoss))} (${Number(i.profitLossPercent).toFixed(2)}%)`,
      time: formatDate(i.investedAt),
    })),
  ].filter(n => !dismissed.includes(n.id));

  const unreadCount = notifications.length;

  return (
    <div className='relative'>
      <button
        onClick={() => setOpen(!open)}
        className='relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow'>
        <Bell className='w-5 h-5 text-gray-400' />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div className='absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-cream-200 z-50 overflow-hidden'>
            <div className='flex items-center justify-between p-4 border-b border-cream-200'>
              <h3 className='font-semibold text-dark-800'>Notifications</h3>
              <div className='flex items-center gap-2'>
                {notifications.length > 0 && (
                  <button
                    onClick={() => setDismissed(prev => [...prev, ...notifications.map(n => n.id)])}
                    className='text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1'>
                    <Check className='w-3 h-3' /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className='text-gray-400 hover:text-dark-800'>
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>

            <div className='max-h-96 overflow-y-auto'>
              {notifications.length === 0 ? (
                <div className='p-8 text-center'>
                  <Bell className='w-8 h-8 text-gray-200 mx-auto mb-2' />
                  <p className='text-gray-400 text-sm'>No notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className='flex items-start gap-3 p-4 hover:bg-cream-50 transition-colors border-b border-cream-100 last:border-0'>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                      <n.icon className='w-4 h-4' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-dark-800'>{n.title}</p>
                      <p className='text-xs text-gray-400 truncate mt-0.5'>{n.description}</p>
                      <p className='text-xs text-gray-300 mt-1'>{n.time}</p>
                    </div>
                    <button
                      onClick={() => setDismissed(prev => [...prev, n.id])}
                      className='text-gray-300 hover:text-gray-500 shrink-0'>
                      <X className='w-3 h-3' />
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