import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Bell, Check, DollarSign, ShieldAlert, Ticket, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { notificationsApi, type NotificationDto } from '../../api/notifications';
import { formatDate } from '../../utils/formatters';

function notificationIcon(type: string) {
  if (type.includes('SECURITY') || type === 'ACCOUNT_LOCKED') {
    return { Icon: ShieldAlert, color: 'bg-rose-500/10 text-rose-500' };
  }
  if (type.includes('TICKET') || type === 'INFO_REQUESTED') {
    return { Icon: Ticket, color: 'bg-orange-500/10 text-orange-500' };
  }
  if (type.includes('TRANSFER')) {
    return { Icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-500' };
  }
  if (type.includes('INVEST')) {
    return { Icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-500' };
  }
  return { Icon: Activity, color: 'bg-blue-500/10 text-blue-500' };
}

function notificationTime(notification: NotificationDto) {
  if (!notification.createdAt) return 'Date unavailable';
  const date = new Date(notification.createdAt);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : formatDate(notification.createdAt);
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, userRole } = useAuth();
  const [open, setOpen] = useState(false);
  const isAdmin = userRole === 'ADMIN';
  const notificationQuery = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsApi.getNotifications(0, 15),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const invalidateNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: invalidateNotifications,
  });
  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: invalidateNotifications,
  });
  const notifications = notificationQuery.data?.content ?? [];

  const openNotification = (notification: NotificationDto) => {
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    setOpen(false);
    if (notification.type.includes('SECURITY') && isAdmin) {
      navigate('/admin/security');
    } else if (notification.type.includes('TICKET') || notification.referenceType === 'SupportTicket') {
      navigate(isAdmin ? '/admin/tasks' : '/help');
    } else if (notification.type.includes('TRANSFER')) {
      navigate('/history');
    } else if (
      notification.type.includes('WORKFLOW_TASK') ||
      notification.referenceType === 'WorkflowTask' ||
      notification.referenceType === 'FlowableTask' ||
      notification.referenceType === 'FlowableProcess'
    ) {
      navigate('/admin/tasks');
    }
  };

  return (
    <div className='relative'>
      <button
        onClick={() => setOpen(!open)}
        aria-label='Notifications'
        aria-expanded={open}
        className='relative w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 shadow-sm hover:border-primary-500 dark:hover:border-primary-500 transition-all'
      >
        <Bell className='w-4.5 h-4.5' />
        {(unreadCountQuery.data ?? 0) > 0 && (
          <span className='absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm'>
            {(unreadCountQuery.data ?? 0) > 9 ? '9+' : unreadCountQuery.data}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div className='absolute right-0 top-12 w-80 sm:w-88 max-w-[calc(100vw-32px)] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800/80'>
              <h3 className='font-bold text-sm text-slate-900 dark:text-zinc-100'>
                {isAdmin ? 'Admin notifications' : 'Notifications'}
              </h3>
              <div className='flex items-center gap-2'>
                {(unreadCountQuery.data ?? 0) > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    disabled={markAllMutation.isPending}
                    className='text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 disabled:opacity-50'
                  >
                    <Check className='w-3 h-3' /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className='p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg'
                  aria-label='Close notifications'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>

            <div className='max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60'>
              {notificationQuery.isError ? (
                <p className='p-6 text-center text-xs text-rose-500'>Notifications could not be loaded. Please retry.</p>
              ) : notificationQuery.isLoading ? (
                <p className='p-6 text-center text-xs text-slate-500 dark:text-zinc-400'>Loading notifications…</p>
              ) : notifications.length === 0 ? (
                <div className='p-8 text-center'>
                  <Bell className='w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2' />
                  <p className='text-slate-500 dark:text-zinc-400 text-xs font-medium'>
                    {isAdmin ? 'No admin notifications yet' : 'No notifications yet'}
                  </p>
                </div>
              ) : notifications.map((notification) => {
                const { Icon, color } = notificationIcon(notification.type);
                return (
                  <button
                    key={notification.id}
                    type='button'
                    onClick={() => openNotification(notification)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50 ${
                      notification.isRead ? 'opacity-70' : ''
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className='w-4 h-4' />
                    </span>
                    <span className='flex-1 min-w-0'>
                      <span className='flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-zinc-100'>
                        {notification.title}
                        {!notification.isRead && <span className='w-1.5 h-1.5 rounded-full bg-primary-500' />}
                      </span>
                      <span className='block text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5'>
                        {notification.body}
                      </span>
                      <span className='block text-[10px] text-slate-400 dark:text-zinc-500 mt-1 font-medium'>
                        {notificationTime(notification)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
