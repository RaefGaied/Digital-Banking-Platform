import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [userReason, setUserReason] = useState('');

  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.getUsers(0, 50) });

  const userMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) =>
      blocked ? adminApi.blockUser(userId, userReason) : adminApi.unblockUser(userId),
    onSuccess: async () => {
      setUserReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
  });

  return (
    <div className='space-y-6'>
      <h2 className='text-xl font-semibold text-dark-800'>Gestion utilisateurs</h2>

      <div className='overflow-hidden rounded-2xl border border-cream-200 bg-white'>
        <table className='min-w-full divide-y divide-cream-200 text-left text-sm'>
          <thead className='bg-cream-50 text-xs uppercase tracking-[0.18em] text-gray-400'>
            <tr>
              <th className='px-4 py-3'>Nom</th>
              <th className='px-4 py-3'>Statut</th>
              <th className='px-4 py-3'>Action</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-cream-100'>
            {usersQuery.data?.content.map((user) => (
              <tr key={user.id}>
                <td className='px-4 py-4'>
                  <div className='font-medium text-dark-800'>{user.name}</div>
                  <div className='text-xs text-gray-400'>{user.email}</div>
                </td>
                <td className='px-4 py-4'><span className='rounded-full px-3 py-1 text-xs font-medium bg-cream-100 text-gray-600'>{user.status}</span></td>
                <td className='px-4 py-4'>
                  {user.status === 'BLOCKED' ? (
                    <button onClick={() => userMutation.mutate({ userId: user.id, blocked: false })} className='rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white'>Debloquer</button>
                  ) : (
                    <button onClick={() => userMutation.mutate({ userId: user.id, blocked: true })} className='rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white'>Bloquer</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium text-dark-800'>Raison du blocage</label>
        <textarea value={userReason} onChange={(e) => setUserReason(e.target.value)} rows={3} className='w-full rounded-2xl border border-cream-200 bg-white px-4 py-3 text-sm text-dark-800' placeholder='Raison optionnelle...' />
      </div>
    </div>
  );
}
