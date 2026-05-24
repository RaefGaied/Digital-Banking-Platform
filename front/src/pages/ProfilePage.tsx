import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/user';
import { formatDate } from '../utils/formatters';
import {
  User, Mail, CreditCard, Building, Calendar, Shield,
  Bell, ChevronRight, X, Loader2, Eye, EyeOff, Check,
  Lock, Smartphone, HelpCircle, LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showNotifSuccess, setShowNotifSuccess] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: userApi.getMe,
  });

  const changePasswordMutation = useMutation({
    mutationFn: userApi.changePassword,
    onSuccess: () => {
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordError('');
    },
    onError: (error: any) => {
      setPasswordError(error.response?.data?.error || 'Current password is incorrect');
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleNotifications = () => {
    setNotifications(!notifications);
    setShowNotifSuccess(true);
    setTimeout(() => setShowNotifSuccess(false), 2000);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  

  if (isLoading) {
    return (
      <div className='grid grid-cols-3 gap-6 animate-pulse'>
        <div className='col-span-2 space-y-6'>
          <div className='card h-48 bg-cream-200' />
          <div className='card h-64 bg-cream-200' />
        </div>
        <div className='space-y-6'>
          <div className='card h-40 bg-cream-200' />
          <div className='card h-40 bg-cream-200' />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='grid grid-cols-3 gap-6'>

        {/* Left column (2/3) */}
        <div className='col-span-2 space-y-6'>

          {/* Hero card */}
          <div className='card p-6'>
            <div className='flex items-center gap-5'>
              {/* Avatar */}
              <div className='relative shrink-0'>
                <div className='w-20 h-20 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg'>
                  <span className='text-white text-2xl font-bold'>
                    {user?.name ? getInitials(user.name) : 'U'}
                  </span>
                </div>
                <div className='absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full' />
              </div>

              {/* Name + badge */}
              <div className='flex-1 min-w-0'>
                <h2 className='text-xl font-bold text-dark-800 truncate'>{user?.name}</h2>
                <p className='text-gray-400 text-sm truncate'>{user?.email}</p>
                <div className='flex items-center gap-3 mt-2'>
                  <span className='inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-full'>
                    <span className='w-1.5 h-1.5 bg-green-500 rounded-full' />
                    Active Account
                  </span>
                  <span className='text-xs text-gray-400'>
                    Member since {user?.createdAt ? formatDate(user.createdAt) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className='card p-6'>
            <h3 className='font-semibold text-dark-800 mb-4'>Personal Information</h3>
            <div className='grid grid-cols-2 gap-3'>
              {[
                { icon: User,       label: 'Full Name',    value: user?.name },
                { icon: Mail,       label: 'Email',        value: user?.email },
              
                { icon: Calendar,   label: 'Member Since', value: user?.createdAt ? formatDate(user.createdAt) : '-' },
                { icon: Building,   label: 'Agency',       value: user?.agency || '0001' },
                { icon: CreditCard, label: 'Account',      value: user?.accountNumber || '-' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className='bg-cream-100 rounded-xl p-4 flex items-start gap-3'>
                  <div className='w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm'>
                    <Icon className='w-4 h-4 text-primary-500' />
                  </div>
                  <div className='min-w-0'>
                    <p className='text-xs text-gray-400 mb-0.5'>{label}</p>
                    <p className='text-sm font-semibold text-dark-800 truncate'>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className='card p-6'>
            <h3 className='font-semibold text-dark-800 mb-4'>Settings</h3>
            <div className='space-y-1'>

              {/* Notifications toggle */}
              <div className='flex items-center justify-between p-4 rounded-xl hover:bg-cream-100 transition-colors'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center'>
                    <Bell className='w-5 h-5 text-primary-500' />
                  </div>
                  <div>
                    <p className='text-sm font-medium text-dark-800'>Notifications</p>
                    <p className='text-xs text-gray-400'>Manage your alerts</p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  {showNotifSuccess && <Check className='w-4 h-4 text-green-500' />}
                  <button onClick={handleNotifications}
                    className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-primary-500' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifications ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* Security */}
              <button onClick={() => setShowPasswordModal(true)}
                className='w-full flex items-center justify-between p-4 rounded-xl hover:bg-cream-100 transition-colors group'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center'>
                    <Lock className='w-5 h-5 text-primary-500' />
                  </div>
                  <div className='text-left'>
                    <p className='text-sm font-medium text-dark-800'>Security</p>
                    <p className='text-xs text-gray-400'>Change your password</p>
                  </div>
                </div>
                <ChevronRight className='w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors' />
              </button>

              {/* Payment Methods */}
              <button onClick={() => navigate('/cards')}
                className='w-full flex items-center justify-between p-4 rounded-xl hover:bg-cream-100 transition-colors group'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center'>
                    <CreditCard className='w-5 h-5 text-primary-500' />
                  </div>
                  <div className='text-left'>
                    <p className='text-sm font-medium text-dark-800'>Payment Methods</p>
                    <p className='text-xs text-gray-400'>Manage your cards</p>
                  </div>
                </div>
                <ChevronRight className='w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors' />
              </button>
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA (1/3) ── */}
        <div className='space-y-6'>

          {/* Account summary */}
          <div className='card p-6'>
            <h3 className='font-semibold text-dark-800 mb-4'>Account Summary</h3>
            <div className='space-y-3'>
              <div className='flex justify-between items-center py-2 border-b border-cream-200'>
                <span className='text-xs text-gray-400'>Account number</span>
                <span className='text-sm font-semibold text-dark-800'>{user?.accountNumber || '-'}</span>
              </div>
              <div className='flex justify-between items-center py-2 border-b border-cream-200'>
                <span className='text-xs text-gray-400'>Agency</span>
                <span className='text-sm font-semibold text-dark-800'>{user?.agency || '0001'}</span>
              </div>
              <div className='flex justify-between items-center py-2 border-b border-cream-200'>
                <span className='text-xs text-gray-400'>Account type</span>
                <span className='text-sm font-semibold text-dark-800'>Digital</span>
              </div>
              <div className='flex justify-between items-center py-2'>
                <span className='text-xs text-gray-400'>Status</span>
                <span className='inline-flex items-center gap-1 text-xs font-medium text-green-600'>
                  <span className='w-1.5 h-1.5 bg-green-500 rounded-full' />Active
                </span>
              </div>
            </div>
          </div>

          {/* Security status */}
          <div className='card p-6'>
            <h3 className='font-semibold text-dark-800 mb-4'>Security Status</h3>
            <div className='space-y-3'>
              {[
                { icon: Lock,        label: 'Password',      status: 'Protected',  ok: true },
                { icon: Shield,      label: 'Encryption',    status: '256-bit TLS', ok: true },
                { icon: Smartphone,  label: '2FA',           status: 'Not enabled', ok: false },
              ].map(({ icon: Icon, label, status, ok }) => (
                <div key={label} className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ok ? 'bg-green-50' : 'bg-orange-50'}`}>
                      <Icon className={`w-4 h-4 ${ok ? 'text-green-500' : 'text-orange-400'}`} />
                    </div>
                    <span className='text-sm text-dark-800'>{label}</span>
                  </div>
                  <span className={`text-xs font-medium ${ok ? 'text-green-600' : 'text-orange-500'}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className='card p-6'>
            <h3 className='font-semibold text-dark-800 mb-4'>Quick Links</h3>
            <div className='space-y-1'>
              {[
                { icon: HelpCircle,  label: 'Help & Support',  action: () => navigate('/help') },
                { icon: CreditCard,  label: 'My Cards',        action: () => navigate('/cards') },
                { icon: LogOut,      label: 'Sign Out',        action: logout, danger: true },
              ].map(({ icon: Icon, label, action, danger }) => (
                <button key={label} onClick={action}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${danger ? 'hover:bg-red-50 text-red-500' : 'hover:bg-cream-100 text-dark-800'}`}>
                  <Icon className={`w-4 h-4 ${danger ? 'text-red-400' : 'text-gray-400'}`} />
                  <span className='text-sm font-medium'>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl'>
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h2 className='text-lg font-bold text-dark-800'>Change Password</h2>
                <p className='text-xs text-gray-400 mt-0.5'>Choose a strong password</p>
              </div>
              <button onClick={() => { setShowPasswordModal(false); setPasswordError(''); }}
                className='w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center text-gray-400 hover:text-dark-800 transition-colors'>
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className='space-y-4'>
              {passwordError && (
                <div className='bg-red-50 border border-red-200 rounded-xl p-3'>
                  <p className='text-red-500 text-sm'>{passwordError}</p>
                </div>
              )}

              {[
                { label: 'Current Password', key: 'currentPassword', show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                { label: 'New Password',     key: 'newPassword',     show: showNew,     toggle: () => setShowNew(!showNew) },
              ].map(({ label, key, show, toggle }) => (
                <div key={key}>
                  <label htmlFor={`pwd-${key}`} className='block text-xs font-medium text-dark-800 mb-2'>{label}</label>
                  <div className='relative'>
                    <input id={`pwd-${key}`} name={key} type={show ? 'text' : 'password'}
                      value={(passwordForm as any)[key]}
                      onChange={e => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                      className='w-full bg-cream-100 border border-cream-200 rounded-xl px-4 py-3 text-dark-800 focus:outline-none focus:border-primary-500 pr-12'
                      placeholder='••••••••' required minLength={key === 'newPassword' ? 6 : undefined} />
                    <button type='button' onClick={toggle}
                      className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-800'>
                      {show ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                </div>
              ))}

              <div>
                <label htmlFor='pwd-confirmPassword' className='block text-xs font-medium text-dark-800 mb-2'>Confirm New Password</label>
                <input id='pwd-confirmPassword' name='confirmPassword' type='password'
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className='w-full bg-cream-100 border border-cream-200 rounded-xl px-4 py-3 text-dark-800 focus:outline-none focus:border-primary-500'
                  placeholder='••••••••' required />
              </div>

              <button type='submit' disabled={changePasswordMutation.isPending}
                className='w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2'>
                {changePasswordMutation.isPending
                  ? <Loader2 className='w-5 h-5 animate-spin' />
                  : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}