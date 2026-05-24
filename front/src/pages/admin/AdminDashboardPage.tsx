import { useMemo } from 'react';
import { Ticket, Users, Activity, MessageSquareQuote } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

const Metric = ({ label, value, Icon }: { label: string; value: number; Icon: any }) => (
  <div className='rounded-2xl border border-white/70 bg-white p-5 shadow-sm'>
    <div className='flex items-center justify-between'>
      <div>
        <p className='text-xs uppercase tracking-[0.22em] text-gray-400'>{label}</p>
        <h3 className='mt-2 text-3xl font-semibold text-dark-800'>{value}</h3>
      </div>
      <div className='rounded-2xl bg-primary-500/10 p-3 text-primary-500'>
        <Icon className='h-5 w-5' />
      </div>
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const { data } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.getDashboard });

  const ticketStats = data?.ticketStatistics;

  const metrics = useMemo(
    () => [
      { label: 'Tickets ouverts', value: ticketStats?.openTickets ?? 0, icon: Ticket },
      { label: 'Conversations actives', value: data?.activeSessions ?? 0, icon: MessageSquareQuote },
      { label: 'Taches en attente', value: data?.pendingTasks ?? 0, icon: Activity },
      { label: 'Utilisateurs actifs', value: data?.activeUsers ?? 0, icon: Users },
    ],
    [data, ticketStats]
  );

  return (
    <div className='space-y-8'>
      <section className='grid gap-4 md:grid-cols-4'>
        {metrics.map(({ label, value, icon: Icon }) => (
          <Metric key={label} label={label} value={value} Icon={Icon} />
        ))}
      </section>

      <section>
        <div className='rounded-3xl border border-white/70 bg-white p-6 shadow-sm'>
          <h2 className='text-xl font-semibold text-dark-800'>Résumé administrateur</h2>
          <p className='mt-2 text-sm text-gray-500'>Vue synthétique des activités récentes.</p>
        </div>
      </section>
    </div>
  );
}
