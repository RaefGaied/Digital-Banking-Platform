import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function AdminAuditPage() {
  const auditQuery = useQuery({ queryKey: ['admin-audit-logs'], queryFn: () => adminApi.getAuditLogs(0, 50) });

  return (
    <div className='space-y-4'>
      <h2 className='text-xl font-semibold text-dark-800'>Journal d'audit</h2>
      <div className='space-y-3'>
        {auditQuery.data?.content.map((entry) => (
          <div key={entry.id} className='rounded-2xl border border-cream-200 bg-white p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='font-medium text-dark-800'>{entry.action}</p>
                <p className='text-xs text-gray-400'>{entry.userEmail || 'system'} · {entry.entity || 'N/A'}</p>
              </div>
              <span className='rounded-full px-3 py-1 text-xs font-medium bg-cream-100 text-gray-600'>{entry.status}</span>
            </div>
            <p className='mt-2 text-sm text-gray-500'>{entry.details || 'Aucun detail'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
