import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { userApi } from '../api/user';
import { formatDate } from '../utils/formatters';
import {
  User,
  Mail,
  CreditCard,
  Building,
  Calendar,
  Shield,
  Bell,
  ChevronRight,
  X,
  Loader2,
  Eye,
  EyeOff,
  Check,
  Lock,
  Smartphone,
  HelpCircle,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { profileApi } from '../api/profile';
import { supportTicketsApi } from '../api/supportTickets';
import Enable2faModal from '../components/auth/Enable2faModal';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showNotifSuccess, setShowNotifSuccess] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailChangeError, setEmailChangeError] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: userApi.getMe,
  });

  const emailTicketsQuery = useQuery({
    queryKey: ['my-support-tickets'],
    queryFn: () => supportTicketsApi.listMine(0, 50),
    enabled: userRole !== 'ADMIN',
    refetchInterval: 30000,
  });
  const emailChangeTickets = emailTicketsQuery.data?.content.filter(
    (ticket) => ticket.ticketType === 'DATA_UPDATE'
      && /email|e-mail|courriel|adresse\s+e|modif(?:ier|er)\s+mon\s+email/i.test(
        `${ticket.subject ?? ''} ${ticket.description ?? ''}`
      )
  ) ?? [];
  const approvedEmailChangeTicket = emailChangeTickets.find((ticket) => ticket.status === 'RESOLVED');
  const pendingEmailChangeTicket = emailChangeTickets.find(
    (ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS'
  );
  const changeEmailMutation = useMutation({
    mutationFn: () => profileApi.changeEmail(newEmail, emailPassword),
    onSuccess: () => {
      logout();
      navigate('/login?email-updated=1', { replace: true });
    },
    onError: (error: unknown) => {
      const serverError = isAxiosError<{ error?: string }>(error) ? error.response?.data?.error : undefined;
      setEmailChangeError(serverError || 'Unable to update your email. Please try again.');
    },
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
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse'>
        <div className='lg:col-span-2 space-y-6'>
          <div className='card h-48 bg-slate-100 dark:bg-zinc-800' />
          <div className='card h-64 bg-slate-100 dark:bg-zinc-800' />
        </div>
        <div className='space-y-6'>
          <div className='card h-40 bg-slate-100 dark:bg-zinc-800' />
          <div className='card h-40 bg-slate-100 dark:bg-zinc-800' />
        </div>
      </div>
    );
  }

  const handleStartEnable = async () => {
    try {
      const res = await profileApi.setup2fa();
      setOtpauthUri(res.otpauthUri);
      setSecretValue(res.secret);
      setShowEnableModal(true);
    } catch (e) {
      console.error('setup2fa failed', e);
    }
  };

  const handleConfirmEnable = async (code: number) => {
    try {
      await profileApi.enable2fa(code);
      setShowEnableModal(false);
      setOtpauthUri(null);
      setSecretValue(null);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      return true;
    } catch (err: any) {
      return false;
    }
  };

  return (
    <>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* ── LEFT COLUMN (2 cols on large screens) ── */}
        <div className='lg:col-span-2 space-y-6'>
          {/* User Hero Card */}
          <div className='card p-6 sm:p-7'>
            <div className='flex flex-wrap sm:flex-nowrap items-center gap-5'>
              {/* Avatar with Glow Ring */}
              <div className='relative shrink-0'>
                <div className='w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20'>
                  <span className='text-white text-2xl font-black'>
                    {user?.name ? getInitials(user.name) : 'U'}
                  </span>
                </div>
                <div className='absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full' />
              </div>

              {/* Identity & Status */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-0.5'>
                  <h2 className='text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-100 truncate'>
                    {user?.name}
                  </h2>
                  <Sparkles className='w-4 h-4 text-primary-500 shrink-0' />
                </div>
                <p className='text-slate-500 dark:text-zinc-400 text-sm truncate font-medium'>{user?.email}</p>
                <div className='flex flex-wrap items-center gap-3 mt-2.5'>
                  <span className='inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full'>
                    <span className='w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse' />
                    Active Account
                  </span>
                  <span className='text-xs text-slate-400 dark:text-zinc-500 font-medium'>
                    Member since {user?.createdAt ? formatDate(user.createdAt) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Grid */}
          <div className='card p-6 sm:p-7'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-base sm:text-lg mb-4'>
              Personal & Account Information
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
              {[
                { icon: User, label: 'Full Legal Name', value: user?.name },
                { icon: Mail, label: 'Email Address', value: user?.email },
                {
                  icon: Calendar,
                  label: 'Member Since',
                  value: user?.createdAt ? formatDate(user.createdAt) : '-',
                },
                { icon: Building, label: 'Assigned Branch', value: user?.agency || '0001' },
                { icon: CreditCard, label: 'Digital Account Number', value: user?.accountNumber || '-' },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className='bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/60 rounded-2xl p-4 flex items-start gap-3.5'
                >
                  <div className='w-9 h-9 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm'>
                    <Icon className='w-4.5 h-4.5 text-primary-500' />
                  </div>
                  <div className='min-w-0'>
                    <p className='text-xs text-slate-400 dark:text-zinc-400 font-semibold mb-0.5'>{label}</p>
                    <p className='text-sm font-bold text-slate-900 dark:text-zinc-100 truncate'>{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {userRole !== 'ADMIN' && (
              <div className='mt-5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/40 p-4 sm:p-5'>
                <h4 className='font-bold text-slate-900 dark:text-zinc-100'>Complete email change</h4>
                {emailTicketsQuery.isLoading ? (
                  <p className='mt-1 text-sm text-slate-500 dark:text-zinc-400'>Checking your verification ticket…</p>
                ) : emailTicketsQuery.isError ? (
                  <p role='alert' className='mt-1 text-sm text-rose-600 dark:text-rose-400'>
                    Could not check your email-verification ticket. Reload the page and try again.
                  </p>
                ) : approvedEmailChangeTicket ? (
                  <form
                    className='mt-3 grid gap-3 sm:grid-cols-2'
                    onSubmit={(event) => {
                      event.preventDefault();
                      setEmailChangeError('');
                      changeEmailMutation.mutate();
                    }}
                  >
                    <p className='sm:col-span-2 text-sm text-emerald-700 dark:text-emerald-300'>
                      Identity review for ticket #{approvedEmailChangeTicket.id} is approved. Enter the new email and confirm your current password. Your email changes only when you submit this form.
                    </p>
                    <label className='grid gap-1 text-xs font-semibold text-slate-600 dark:text-zinc-300'>
                      New email address
                      <input
                        type='email'
                        required
                        autoComplete='email'
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        className='rounded-xl border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm'
                      />
                    </label>
                    <label className='grid gap-1 text-xs font-semibold text-slate-600 dark:text-zinc-300'>
                      Current password
                      <input
                        type='password'
                        required
                        autoComplete='current-password'
                        value={emailPassword}
                        onChange={(event) => setEmailPassword(event.target.value)}
                        className='rounded-xl border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm'
                      />
                    </label>
                    {emailChangeError && (
                      <p role='alert' className='sm:col-span-2 text-sm font-semibold text-rose-600 dark:text-rose-400'>
                        {emailChangeError}
                      </p>
                    )}
                    <button
                      type='submit'
                      disabled={changeEmailMutation.isPending}
                      className='sm:col-span-2 justify-self-start rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60'
                    >
                      {changeEmailMutation.isPending ? 'Updating email…' : 'Confirm email change'}
                    </button>
                  </form>
                ) : pendingEmailChangeTicket ? (
                  <p className='mt-1 text-sm text-slate-600 dark:text-zinc-400'>
                    Email-change ticket #{pendingEmailChangeTicket.id} is {pendingEmailChangeTicket.status.toLowerCase()}. You can enter the new address here after the identity review is approved.
                  </p>
                ) : (
                  <p className='mt-1 text-sm text-slate-600 dark:text-zinc-400'>
                    Request an email change in Banking Agent Chat first. The form becomes available here after an administrator approves the identity-verification ticket.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Preferences & Settings */}
          <div className='card p-6 sm:p-7'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-base sm:text-lg mb-4'>
              Security & Preferences
            </h3>
            <div className='space-y-2'>
              {/* Notifications Toggle */}
              <div className='flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-800'>
                <div className='flex items-center gap-3.5'>
                  <div className='w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center'>
                    <Bell className='w-5 h-5 text-primary-500' />
                  </div>
                  <div>
                    <p className='text-sm font-bold text-slate-900 dark:text-zinc-100'>Push Notifications</p>
                    <p className='text-xs text-slate-400 dark:text-zinc-400'>
                      Instant transaction alerts and statements
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  {showNotifSuccess && <Check className='w-4 h-4 text-emerald-500' />}
                  <button
                    onClick={handleNotifications}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications ? 'bg-orange-500' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        notifications ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Password Change Button */}
              <button
                onClick={() => setShowPasswordModal(true)}
                className='w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-zinc-800'
              >
                <div className='flex items-center gap-3.5'>
                  <div className='w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center'>
                    <Lock className='w-5 h-5 text-primary-500' />
                  </div>
                  <div className='text-left'>
                    <p className='text-sm font-bold text-slate-900 dark:text-zinc-100'>Account Security</p>
                    <p className='text-xs text-slate-400 dark:text-zinc-400'>Update login password</p>
                  </div>
                </div>
                <ChevronRight className='w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors' />
              </button>

              {/* Cards Management Navigation */}
              <button
                onClick={() => navigate('/cards')}
                className='w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-zinc-800'
              >
                <div className='flex items-center gap-3.5'>
                  <div className='w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center'>
                    <CreditCard className='w-5 h-5 text-primary-500' />
                  </div>
                  <div className='text-left'>
                    <p className='text-sm font-bold text-slate-900 dark:text-zinc-100'>Payment Cards</p>
                    <p className='text-xs text-slate-400 dark:text-zinc-400'>
                      Manage limits, contactless and virtual cards
                    </p>
                  </div>
                </div>
                <ChevronRight className='w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors' />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (1 col) ── */}
        <div className='space-y-6'>
          {/* Account Summary Card */}
          <div className='card p-6'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-sm uppercase tracking-wider mb-4'>
              Account Status
            </h3>
            <div className='space-y-3'>
              <div className='flex justify-between items-center py-2 border-b border-slate-100 dark:border-zinc-800'>
                <span className='text-xs text-slate-400 dark:text-zinc-400'>Account Number</span>
                <span className='text-sm font-bold text-slate-900 dark:text-zinc-100 font-mono'>
                  {user?.accountNumber || '-'}
                </span>
              </div>
              <div className='flex justify-between items-center py-2 border-b border-slate-100 dark:border-zinc-800'>
                <span className='text-xs text-slate-400 dark:text-zinc-400'>Agency / Branch</span>
                <span className='text-sm font-bold text-slate-900 dark:text-zinc-100 font-mono'>
                  {user?.agency || '0001'}
                </span>
              </div>
              <div className='flex justify-between items-center py-2 border-b border-slate-100 dark:border-zinc-800'>
                <span className='text-xs text-slate-400 dark:text-zinc-400'>Account Type</span>
                <span className='text-sm font-bold text-slate-900 dark:text-zinc-100'>Premier Digital</span>
              </div>
              <div className='flex justify-between items-center py-2'>
                <span className='text-xs text-slate-400 dark:text-zinc-400'>Verification Level</span>
                <span className='inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400'>
                  <span className='w-2 h-2 bg-emerald-500 rounded-full' />
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Security & 2FA Status */}
          <div className='card p-6'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-sm uppercase tracking-wider mb-4'>
              Security Suite
            </h3>
            <div className='space-y-3'>
              {[
                { icon: Lock, label: 'Password', status: 'Active & Protected', ok: true },
                { icon: Shield, label: 'Data Encryption', status: '256-bit TLS SSL', ok: true },
                {
                  icon: Smartphone,
                  label: 'Two-Factor (2FA)',
                  status: user?.twoFactorEnabled ? 'Enabled' : 'Disabled',
                  ok: !!user?.twoFactorEnabled,
                },
              ].map(({ icon: Icon, label, status, ok }) => (
                <div key={label} className='flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        ok ? 'bg-emerald-500/10' : 'bg-orange-500/10'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500'
                        }`}
                      />
                    </div>
                    <span className='text-xs font-semibold text-slate-800 dark:text-zinc-200'>{label}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span
                      className={`text-xs font-bold ${
                        ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500'
                      }`}
                    >
                      {status}
                    </span>
                    {label === 'Two-Factor (2FA)' && !ok && (
                      <button
                        onClick={handleStartEnable}
                        className='px-3 py-1 rounded-full text-xs font-bold bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm'
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className='card p-6'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-sm uppercase tracking-wider mb-4'>
              Shortcuts
            </h3>
            <div className='space-y-1.5'>
              {[
                { icon: HelpCircle, label: 'Help & Knowledge Base', action: () => navigate('/help') },
                { icon: CreditCard, label: 'My Cards & Wallets', action: () => navigate('/cards') },
                { icon: LogOut, label: 'Sign Out Account', action: logout, danger: true },
              ].map(({ icon: Icon, label, action, danger }) => (
                <button
                  key={label}
                  onClick={action}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left font-semibold text-xs ${
                    danger
                      ? 'hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-800 dark:text-zinc-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${danger ? 'text-rose-500' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CHANGE PASSWORD MODAL ── */}
      {showPasswordModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center justify-between mb-5'>
              <div>
                <h2 className='text-lg font-bold text-slate-900 dark:text-zinc-100'>Change Password</h2>
                <p className='text-xs text-slate-400 dark:text-zinc-500 mt-0.5'>
                  Choose a robust password with at least 6 characters
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                }}
                className='w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className='space-y-4'>
              {passwordError && (
                <div className='bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-3 text-xs font-medium text-rose-600 dark:text-rose-400'>
                  {passwordError}
                </div>
              )}

              {[
                {
                  label: 'Current Password',
                  key: 'currentPassword',
                  show: showCurrent,
                  toggle: () => setShowCurrent(!showCurrent),
                },
                {
                  label: 'New Password',
                  key: 'newPassword',
                  show: showNew,
                  toggle: () => setShowNew(!showNew),
                },
              ].map(({ label, key, show, toggle }) => (
                <div key={key}>
                  <label
                    htmlFor={`pwd-${key}`}
                    className='block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2'
                  >
                    {label}
                  </label>
                  <div className='relative'>
                    <input
                      id={`pwd-${key}`}
                      name={key}
                      type={show ? 'text' : 'password'}
                      value={(passwordForm as any)[key]}
                      onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                      className='w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-primary-500 pr-12'
                      placeholder='••••••••'
                      required
                      minLength={key === 'newPassword' ? 6 : undefined}
                    />
                    <button
                      type='button'
                      onClick={toggle}
                      className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'
                    >
                      {show ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                </div>
              ))}

              <div>
                <label
                  htmlFor='pwd-confirmPassword'
                  className='block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2'
                >
                  Confirm New Password
                </label>
                <input
                  id='pwd-confirmPassword'
                  name='confirmPassword'
                  type='password'
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className='w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-primary-500'
                  placeholder='••••••••'
                  required
                />
              </div>

              <button
                type='submit'
                disabled={changePasswordMutation.isPending}
                className='w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50'
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <Enable2faModal
        open={showEnableModal}
        otpauthUri={otpauthUri}
        secret={secretValue}
        onClose={() => setShowEnableModal(false)}
        onEnable={handleConfirmEnable}
      />
    </>
  );
}