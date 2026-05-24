import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/admin';

export default function AdminTasksPage() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const tasksQuery = useQuery({ queryKey: ['admin-tasks'], queryFn: () => adminApi.getTasks(0, 50) });
  const selectedTaskQuery = useQuery({ queryKey: ['admin-task', selectedTaskId], queryFn: () => adminApi.getTask(selectedTaskId as number), enabled: selectedTaskId !== null });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-dark-800'>Inbox administrateur</h2>
        <button onClick={refresh} className='inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm'>
          <RefreshCw className='h-4 w-4' /> Rafraichir
        </button>
      </div>

      <div className='overflow-hidden rounded-2xl border border-cream-200 bg-white'>
        <table className='min-w-full divide-y divide-cream-200 text-left text-sm'>
          <thead className='bg-cream-50 text-xs uppercase tracking-[0.18em] text-gray-400'>
            <tr>
              <th className='px-4 py-3'>Tache</th>
              <th className='px-4 py-3'>Client</th>
              <th className='px-4 py-3'>Type</th>
              <th className='px-4 py-3'>Statut</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-cream-100'>
            {tasksQuery.data?.content.map((task) => (
              <tr key={task.id} onClick={() => setSelectedTaskId(task.id)} className='cursor-pointer hover:bg-cream-50'>
                <td className='px-4 py-4'>#{task.id}<div className='text-xs text-gray-400'>{task.processInstanceId}</div></td>
                <td className='px-4 py-4'>{task.client?.name || task.ticket?.subject || 'N/A'}<div className='text-xs text-gray-400'>{task.client?.email || 'N/A'}</div></td>
                <td className='px-4 py-4'><span className='rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-gray-600'>{task.taskType || 'TASK'}</span></td>
                <td className='px-4 py-4'><span className='rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700'>{task.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTaskId && selectedTaskQuery.data?.task && (
        <div className='rounded-2xl border border-white/70 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-dark-800'>Détails tâche #{selectedTaskId}</h3>
          <p className='mt-2 text-sm text-gray-500'>{selectedTaskQuery.data.task.description || selectedTaskQuery.data.task.ticket?.description}</p>
        </div>
      )}
    </div>
  );
}
