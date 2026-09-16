import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../api/account';
import { userApi } from '../api/user';
import { sessionsApi } from '../api/sessions';
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Loader2, CheckCircle,
  Zap, QrCode, Check, ShieldCheck, Clock, Info,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../hooks/useAuth';

type TabType = 'deposit' | 'withdraw' | 'transfer' | 'payment' | 'qrcode';

const TAB_META: Record<TabType, {
  label: string; icon: React.ElementType; color: string; bg: string;
  tip: string; limits: string; time: string;
}> = {
  deposit: {
    label: 'Deposit', icon: TrendingUp,
    color: '#16a34a', bg: '#f0fdf4',
    tip: 'Deposits are credited instantly to your balance.',
    limits: 'No minimum. No maximum.',
    time: 'Instant',
  },
  withdraw: {
    label: 'Withdraw', icon: TrendingDown,
    color: '#dc2626', bg: '#fef2f2',
    tip: 'Withdrawals are processed immediately during business hours.',
    limits: 'Min: R$ 1,00 — Max: account balance.',
    time: 'Up to 1 business day',
  },
  transfer: {
    label: 'Transfer', icon: ArrowLeftRight,
    color: '#2563eb', bg: '#eff6ff',
    tip: 'Transfer between FinBank accounts is instant and free.',
    limits: 'Min: R$ 0,01.',
    time: 'Instant',
  },
  payment: {
    label: 'Payment', icon: Zap,
    color: '#e8611a', bg: '#fff7ed',
    tip: 'Payments work 24/7, including weekends and holidays.',
    limits: 'Daily limit: R$ 20.000,00.',
    time: 'Instant (24/7)',
  },
  qrcode: {
    label: 'QR Code', icon: QrCode,
    color: '#7c3aed', bg: '#f5f3ff',
    tip: 'Share your QR Code to receive payments from any bank.',
    limits: 'No limits to receive.',
    time: 'Instant',
  },
};

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const { isAuthenticated, userRole } = useAuth();
  const canLoadTransactions = isAuthenticated && userRole === 'USER';
  const [searchParams] = useSearchParams();
  const parseTabParam = (value: string | null): TabType => {
    if (value === 'pix') return 'payment';
    if (value === 'deposit' || value === 'withdraw' || value === 'transfer' || value === 'payment' || value === 'qrcode') return value;
    return 'deposit';
  };
  const [tab, setTab] = useState<TabType>(parseTabParam(searchParams.get('tab')));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [targetAccount, setTargetAccount] = useState('');
  const [paymentKey, setPaymentKey] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const text = locale === 'fr'
    ? {
        pageTitle: 'Virements et paiements',
        pageSubtitle: 'Deplacez votre argent rapidement et en securite',
        myPaymentQrCode: 'Mon QR Code de paiement',
        shareReceive: 'Partagez pour recevoir des paiements de toute banque',
        paymentKeyAccount: 'Cle de paiement (numero de compte)',
        name: 'Nom',
        agency: 'Agence',
        copied: 'Copie !',
        copyPaymentKey: 'Copier la cle de paiement',
        transactionSuccess: 'Transaction effectuee avec succes !',
        transactionFailed: 'La transaction a echoue',
        amount: 'Montant',
        destinationAccount: 'Compte destinataire',
        accountNumber: 'Numero de compte',
        paymentKey: 'Cle de paiement',
        paymentKeyPlaceholder: 'E-mail, telephone ou cle aleatoire',
        description: 'Description',
        optional: '(optionnel)',
        descriptionPlaceholder: 'ex: Loyer, courses, services...',
        confirmDeposit: 'Confirmer le depot',
        confirmWithdrawal: 'Confirmer le retrait',
        confirmTransfer: 'Confirmer le virement',
        sendPayment: 'Envoyer le paiement',
        availableBalance: 'Solde disponible',
        fundsProtected: 'Fonds proteges par chiffrement 256 bits',
        processingTime: 'Delai de traitement',
        limits: 'Limites',
        security: 'Securite',
        sec1: 'Chiffrement de bout en bout',
        sec2: 'Detection de fraude en temps reel',
        sec3: 'Confirmation de transaction',
      }
    : {
        pageTitle: 'Transfer & Payments',
        pageSubtitle: 'Move your money quickly and securely',
        myPaymentQrCode: 'My QR Code',
        shareReceive: 'Share to receive payments from any bank',
        transactionSuccess: 'Transaction completed successfully!',
        transactionFailed: 'Transaction failed',
        amount: 'Amount',
        destinationAccount: 'Destination account',
        accountNumber: 'Account number',
        paymentKey: 'Payment Key',
        paymentKeyPlaceholder: 'Email, phone or random key',
        description: 'Description',
        optional: '(optional)',
        descriptionPlaceholder: 'e.g. Rent, groceries, services...',
        confirmDeposit: 'Confirm Deposit',
        confirmWithdrawal: 'Confirm Withdrawal',
        confirmTransfer: 'Confirm Transfer',
        sendPayment: 'Send payment',
        availableBalance: 'Available balance',
        fundsProtected: 'Funds protected by 256-bit encryption',
        processingTime: 'Processing time',
        limits: 'Limits',
        security: 'Security',
        sec1: 'End-to-end encryption',
        sec2: 'Real-time fraud detection',
        sec3: 'Transaction confirmation',
      };

  const { data: account } = useQuery({ queryKey: ['account'], queryFn: accountApi.getMyAccount, enabled: canLoadTransactions, retry: false, refetchOnWindowFocus: false });
  const { data: user }    = useQuery({ queryKey: ['user'],    queryFn: userApi.getMe, enabled: canLoadTransactions, retry: false, refetchOnWindowFocus: false });
  const { data: activeSessions = [] } = useQuery({ queryKey: ['my-active-sessions'], queryFn: sessionsApi.getActive, enabled: canLoadTransactions, retry: false, refetchOnWindowFocus: false });

  if (!canLoadTransactions) {
    return (
      <div className='card p-6'>
        <h1 className='text-2xl font-bold text-dark-800'>Transfers & Payments</h1>
        <p className='text-gray-400 text-sm mt-1'>Transfer tools are available for user sessions only.</p>
      </div>
    );
  }

  const paymentPayload = account
    ? `00020126330014BR.GOV.BCB.PIX0111${account.number}5204000053039865802BR5913${(user?.name || 'Usuario').slice(0, 13)}6009SAO PAULO62070503***6304`
    : '';

  const mutation = useMutation({
    mutationFn: async () => {
      const activeSession = activeSessions.find((session) => session.agentId) ?? activeSessions[0];
      const data = {
        amount: parseFloat(amount),
        description,
        targetAccountNumber: tab === 'transfer' ? targetAccount : undefined,
        sessionId: tab === 'transfer' ? activeSession?.id : undefined,
      };
      if (tab === 'deposit') return accountApi.deposit(data);
      if (tab === 'withdraw') return accountApi.withdraw(data);
      return accountApi.transfer(data);
    },
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['my-agents'] });
      queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
      setSuccess(true);
      setValidationMessage(
        transaction.agentDecision === 'TRIGGER_BPMN'
          ? `Validation required. Flowable process: ${transaction.flowableProcessId ?? 'pending'}`
          : ''
      );
      setAmount(''); setDescription(''); setTargetAccount(''); setPaymentKey('');
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const meta = TAB_META[tab];
  const tabs: TabType[] = ['deposit', 'withdraw', 'transfer', 'payment', 'qrcode'];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-dark-800'>{text.pageTitle}</h1>
        <p className='text-gray-400 text-sm mt-1'>{text.pageSubtitle}</p>
      </div>

      {/* Tabs */}
      <div className='card p-2 flex gap-1'>
        {tabs.map(key => {
          const { label, icon: Icon } = TAB_META[key];
          return (
            <button key={key} onClick={() => { setTab(key); setSuccess(false); setValidationMessage(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === key ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-primary-500 hover:bg-primary-50'
              }`}>
              <Icon className='w-4 h-4' />
              {label}
            </button>
          );
        })}
      </div>

      <div className='grid grid-cols-3 gap-6'>

        {/* Left column - form */}
        <div className='col-span-2 space-y-4'>

          {tab === 'qrcode' ? (
            <div className='card p-6'>
              <div className='text-center'>
                <h3 className='font-semibold text-dark-800 mb-1'>{text.myPaymentQrCode}</h3>
                <p className='text-gray-400 text-sm mb-6'>{text.shareReceive}</p>

                <div className='flex justify-center mb-6'>
                  <div className='p-5 bg-white rounded-2xl shadow-sm border border-cream-200 inline-block'>
                    {account ? (
                      <QRCodeSVG value={paymentPayload} size={180} level='M' includeMargin={true} fgColor='#2d2d2d' />
                    ) : (
                      <div className='w-44 h-44 bg-cream-100 rounded-xl animate-pulse' />
                    )}
                  </div>
                </div>

                <div className='text-left bg-cream-100 rounded-xl p-4'>
                  <p className='text-xs text-gray-400 mb-1'>Account number</p>
                  <p className='text-dark-800 font-mono font-semibold text-lg'>{account?.number || '...'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className='card p-6 space-y-4'>

              {success && (
                <div className='flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4'>
                  <CheckCircle className='w-5 h-5 text-green-500 shrink-0' />
                  <p className='text-green-600 text-sm font-medium'>{validationMessage || text.transactionSuccess}</p>
                </div>
              )}

              {mutation.isError && (
                <div className='bg-red-50 border border-red-200 rounded-xl p-4'>
                  <p className='text-red-500 text-sm'>{(mutation.error as any)?.response?.data?.error || text.transactionFailed}</p>
                </div>
              )}

              {/* Amount */}
              <div>
                <label htmlFor='txn-amount' className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2'>{text.amount}</label>
                <div className='relative'>
                  <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm'>R$</span>
                  <input id='txn-amount' name='amount' type='number' value={amount} onChange={e => setAmount(e.target.value)}
                    className='w-full bg-cream-100 border border-cream-200 rounded-xl pl-10 pr-4 py-3.5 text-dark-800 text-lg font-semibold placeholder-gray-300 focus:outline-none focus:border-primary-500 transition-colors'
                    placeholder='0,00' min='0.01' step='0.01' />
                </div>
              </div>

              {/* Quick amounts */}
              <div className='grid grid-cols-4 gap-2'>
                {[50, 100, 500, 1000].map(v => (
                  <button key={v} onClick={() => setAmount(String(v))}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      amount === String(v)
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-cream-100 hover:bg-primary-50 hover:text-primary-500 text-gray-500 border-cream-200 hover:border-primary-200'
                    }`}>
                    {formatCurrency(v)}
                  </button>
                ))}
              </div>

              {/* Target account (transfer) */}
              {tab === 'transfer' && (
                <div>
                  <label htmlFor='txn-targetAccount' className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2'>{text.destinationAccount}</label>
                  <input id='txn-targetAccount' name='targetAccount' type='text' value={targetAccount} onChange={e => setTargetAccount(e.target.value)}
                    className='w-full bg-cream-100 border border-cream-200 rounded-xl px-4 py-3.5 text-dark-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 transition-colors'
                    placeholder={text.accountNumber} />
                </div>
              )}

              {/* Payment key */}
              {tab === 'payment' && (
                <div>
                  <label htmlFor='txn-paymentKey' className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2'>{text.paymentKey}</label>
                  <input id='txn-paymentKey' name='paymentKey' type='text' value={paymentKey} onChange={e => setPaymentKey(e.target.value)}
                    className='w-full bg-cream-100 border border-cream-200 rounded-xl px-4 py-3.5 text-dark-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 transition-colors'
                    placeholder={text.paymentKeyPlaceholder} />
                </div>
              )}

              {/* Description */}
              <div>
                <label htmlFor='txn-description' className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2'>
                  {text.description} <span className='text-gray-300 normal-case font-normal'>{text.optional}</span>
                </label>
                <input id='txn-description' name='description' type='text' value={description} onChange={e => setDescription(e.target.value)}
                  className='w-full bg-cream-100 border border-cream-200 rounded-xl px-4 py-3.5 text-dark-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 transition-colors'
                  placeholder={text.descriptionPlaceholder} />
              </div>

              {/* Submit */}
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !amount}
                className='w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm'>
                {mutation.isPending ? <Loader2 className='w-5 h-5 animate-spin' /> : (
                  <>
                    {tab === 'deposit'  && <><TrendingUp className='w-4 h-4' /> {text.confirmDeposit}</>}
                    {tab === 'withdraw' && <><TrendingDown className='w-4 h-4' /> {text.confirmWithdrawal}</>}
                    {tab === 'transfer' && <><ArrowLeftRight className='w-4 h-4' /> {text.confirmTransfer}</>}
                    {tab === 'payment' && <><Zap className='w-4 h-4' /> {text.sendPayment}</>}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── COLUNA DIREITA — info contextual ── */}
        <div className='space-y-4'>

          {/* Balance */}
          <div className='card p-5'>
            <p className='text-xs font-medium text-gray-400 uppercase tracking-wide mb-1'>{text.availableBalance}</p>
            <p className='text-2xl font-bold text-dark-800'>{formatCurrency(account?.balance || 0)}</p>
            <div className='mt-3 pt-3 border-t border-cream-200 flex items-center gap-2 text-xs text-gray-400'>
              <ShieldCheck className='w-3.5 h-3.5 text-green-500' />
              {text.fundsProtected}
            </div>
          </div>

          {/* Contextual info */}
          <div className='card p-5 space-y-4'>
            <div className='flex items-center gap-2 mb-1'>
              <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ background: meta.bg }}>
                <meta.icon className='w-4 h-4' style={{ color: meta.color }} />
              </div>
              <p className='text-sm font-semibold text-dark-800'>{meta.label}</p>
            </div>

            {[
              { icon: Clock, label: text.processingTime, value: meta.time },
              { icon: Info,  label: text.limits,         value: meta.limits },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className='flex items-start gap-3'>
                <div className='w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center shrink-0 mt-0.5'>
                  <Icon className='w-3.5 h-3.5 text-gray-400' />
                </div>
                <div>
                  <p className='text-xs text-gray-400'>{label}</p>
                  <p className='text-sm font-medium text-dark-800'>{value}</p>
                </div>
              </div>
            ))}

            <div className='bg-cream-100 rounded-xl p-3'>
              <p className='text-xs text-gray-500 leading-relaxed'>{meta.tip}</p>
            </div>
            {tab === 'transfer' && (
              <div className='bg-orange-50 border border-orange-200 rounded-xl p-3'>
                <p className='text-xs text-orange-700 leading-relaxed'>
                  Transfers above 5000 are routed to the Sensitive Line. Use an active session with an agent, then check the Agents page for the trace.
                </p>
              </div>
            )}
          </div>

          {/* Security */}
          <div className='card p-5'>
            <p className='text-xs font-medium text-dark-800 mb-3'>{text.security}</p>
            <div className='space-y-2.5'>
              {[
                text.sec1,
                text.sec2,
                text.sec3,
              ].map(item => (
                <div key={item} className='flex items-center gap-2.5'>
                  <div className='w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0'>
                    <Check className='w-3 h-3 text-green-500' />
                  </div>
                  <p className='text-xs text-gray-500'>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
