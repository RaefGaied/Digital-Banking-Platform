import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, Banknote, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { atmApi } from '../api/atm';
import { formatCurrency } from '../utils/formatters';

export default function AtmSimulatorPage() {
  const [reference, setReference] = useState('');
  const [code, setCode] = useState('');
  const networkQuery = useQuery({
    queryKey: ['atm-network-status'],
    queryFn: atmApi.getNetworkStatus,
  });
  const redeemMutation = useMutation({
    mutationFn: () => atmApi.redeemWithdrawal(reference.trim(), code),
    onSuccess: () => {
      setReference('');
      setCode('');
    },
  });

  const errorMessage = isAxiosError<{ error?: string }>(redeemMutation.error)
    ? redeemMutation.error.response?.data?.error
    : undefined;

  return (
    <main className='mx-auto w-full max-w-3xl space-y-6'>
      <header className='rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8'>
        <div className='flex items-center gap-3'>
          <div className='rounded-2xl bg-orange-500/20 p-3 text-orange-300'>
            <Banknote className='h-7 w-7' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-orange-300'>FinBank · Cash desk</p>
            <h1 className='text-2xl font-black sm:text-3xl'>ATM withdrawal simulator</h1>
          </div>
        </div>
        <p className='mt-4 max-w-2xl text-sm leading-6 text-slate-300'>
          Enter the withdrawal reference and one-time code provided by the customer. A successful check completes
          the pending transaction exactly once.
        </p>
      </header>

      <section className='rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'>
        <div className='flex items-start gap-3'>
          <ShieldAlert className='mt-0.5 h-5 w-5 shrink-0' />
          <div>
            <p className='font-bold'>Demonstration only — not connected to a real ATM or bank network.</p>
            <p className='mt-1 text-sm'>
              Access is restricted to administrators acting as counter agents in this prototype.
            </p>
          </div>
        </div>
      </section>

      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
        <div className='mb-5 flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-extrabold text-slate-900 dark:text-zinc-100'>Validate cash withdrawal</h2>
            <p className='mt-1 text-sm text-slate-500 dark:text-zinc-400'>The code is single-use and expires after 30 minutes.</p>
          </div>
          <Activity className='h-5 w-5 text-orange-500' />
        </div>

        <form
          className='space-y-4'
          onSubmit={(event) => {
            event.preventDefault();
            redeemMutation.mutate();
          }}
        >
          <label className='block space-y-2 text-sm font-semibold text-slate-700 dark:text-zinc-300'>
            Withdrawal reference
            <input
              autoComplete='off'
              required
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className='w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900'
              placeholder='UUID reference from customer'
            />
          </label>
          <label className='block space-y-2 text-sm font-semibold text-slate-700 dark:text-zinc-300'>
            One-time code
            <input
              autoComplete='one-time-code'
              required
              inputMode='numeric'
              pattern='[0-9]{8}'
              maxLength={8}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
              className='w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-lg tracking-[0.35em] dark:border-zinc-700 dark:bg-zinc-900'
              placeholder='8 digits'
            />
          </label>
          <button
            type='submit'
            disabled={redeemMutation.isPending || reference.trim().length === 0 || code.length !== 8}
            className='flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {redeemMutation.isPending ? <Loader2 className='h-5 w-5 animate-spin' /> : <Banknote className='h-5 w-5' />}
            Verify and complete withdrawal
          </button>
        </form>

        {networkQuery.data && (
          <p className='mt-4 text-xs text-slate-500 dark:text-zinc-400'>
            {networkQuery.data.message}
          </p>
        )}
        {networkQuery.isError && (
          <p role='alert' className='mt-4 text-sm font-medium text-rose-600'>Unable to check simulated network status.</p>
        )}
        {redeemMutation.isError && (
          <p role='alert' className='mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'>
            {errorMessage || 'Withdrawal could not be validated.'}
          </p>
        )}
        {redeemMutation.data && (
          <div role='status' className='mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'>
            <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0' />
            <div>
              <p className='font-bold'>{redeemMutation.data.message}</p>
              <p className='mt-1 text-sm'>Amount: {formatCurrency(redeemMutation.data.amount)}</p>
              <p className='text-xs'>Reference: {redeemMutation.data.reference}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}