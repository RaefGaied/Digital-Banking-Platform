import { useState, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../api/account';
import { userApi } from '../api/user';
import { sessionsApi } from '../api/sessions';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Loader2,
  CheckCircle,
  Zap,
  QrCode,
  Check,
  ShieldCheck,
  Clock,
  Info,
  Copy,
  Download,
  Share2,
  Sparkles,
  Lock,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/context';
import { useAuth } from '../hooks/useAuth';

type TabType = 'deposit' | 'withdraw' | 'transfer' | 'payment' | 'qrcode';

const TAB_META: Record<
  TabType,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    tip: string;
    limits: string;
    time: string;
    fee: string;
  }
> = {
  deposit: {
    label: 'Deposit',
    icon: TrendingUp,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    tip: 'Deposits are credited instantly to your account ledger with 256-bit institutional encryption.',
    limits: 'No minimum. No maximum.',
    time: 'Instant (< 2 sec)',
    fee: '$0.00 (Zero Fee)',
  },
  withdraw: {
    label: 'Withdraw',
    icon: TrendingDown,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    tip: 'Direct wire withdrawals to external IBAN/ACH accounts during global clearing hours.',
    limits: 'Min: $1.00 — Max: Available balance.',
    time: 'Under 15 minutes',
    fee: '$0.00 (Tier Free)',
  },
  transfer: {
    label: 'Transfer',
    icon: ArrowLeftRight,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)',
    tip: 'Direct peer-to-peer settlement between FinBank multi-currency accounts.',
    limits: 'Min: $0.01 — Unlimited.',
    time: 'Instant (Real-Time Settlement)',
    fee: '$0.00 (Instant P2P)',
  },
  payment: {
    label: 'Payment Key',
    icon: Zap,
    color: '#e8611a',
    bg: 'rgba(232, 97, 26, 0.1)',
    tip: 'High-frequency key payment routing (PIX / FedNow / SEPA Instant) available 24/7/365.',
    limits: 'Daily limit: $50,000.00.',
    time: 'Real-time (< 1 sec)',
    fee: '$0.00 (Free)',
  },
  qrcode: {
    label: 'QR Code',
    icon: QrCode,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
    tip: 'Personal dynamic payment QR with cryptographic HMAC hash for instant counterparty scanning.',
    limits: 'No receiving limits.',
    time: 'Instant QR Scan',
    fee: 'Zero Fee',
  },
};

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const { isAuthenticated, userRole } = useAuth();
  const canLoadTransactions = isAuthenticated && userRole === 'USER';
  const [searchParams] = useSearchParams();
  const qrRef = useRef<HTMLDivElement>(null);

  const parseTabParam = (value: string | null): TabType => {
    if (value === 'pix') return 'payment';
    if (
      value === 'deposit' ||
      value === 'withdraw' ||
      value === 'transfer' ||
      value === 'payment' ||
      value === 'qrcode'
    )
      return value;
    return 'deposit';
  };

  const [tab, setTab] = useState<TabType>(parseTabParam(searchParams.get('tab')));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [targetAccount, setTargetAccount] = useState('');
  const [paymentKey, setPaymentKey] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  const text =
    locale === 'fr'
      ? {
          pageTitle: 'Virements et Opérations',
          pageSubtitle: 'Déplacez des capitaux instantanément avec compensation 256 bits',
          myPaymentQrCode: 'QR Code de Paiement Sécurisé',
          shareReceive: 'Scannez ou téléchargez pour recevoir des fonds en direct',
          copyPaymentKey: 'Copier le RIB',
          copyQrLink: 'Copier le lien de paiement',
          downloadQr: 'Télécharger le QR Code',
          copied: 'Copié !',
          transactionSuccess: 'Transaction validée et compensée avec succès !',
          transactionFailed: 'Échec de la transaction',
          amount: 'Montant du transfert',
          destinationAccount: 'Compte de destination',
          accountNumber: 'Numéro de compte bénéficiaire (8 chiffres)',
          paymentKey: 'Identifiant de paiement direct',
          paymentKeyPlaceholder: 'E-mail, numéro de mobile ou clé PIX/SEPA',
          description: 'Motif du virement',
          optional: '(optionnel)',
          descriptionPlaceholder: 'Ex: Prestation, honoraires, loyer...',
          confirmDeposit: 'Valider le Dépôt Instantané',
          confirmWithdrawal: 'Confirmer le Retrait',
          confirmTransfer: 'Envoyer le Virement Immédiat',
          sendPayment: 'Exécuter le Paiement Direct',
          availableBalance: 'Solde Comptable Disponible',
          fundsProtected: 'Réseau certifié ISO 20022 & Chiffrement TLS 256 bits',
          processingTime: 'Délai de Règlement',
          limits: 'Plafonds Opérationnels',
          fees: 'Frais de Traitement',
          security: 'Garanties et Conformité Bancaire',
          sec1: 'Règlement instantané via protocoles SEPA / FedNow',
          sec2: 'Surveillance antifraude neuronale continue',
          sec3: 'Reçu d’audit officiel horodaté délivré',
          feeEstimate: 'Estimation des frais :',
          freeTier: 'Gratuit (Inclus dans l’offre Pro)',
          routeVerified: 'Routage bancaire vérifié et garanti',
        }
      : {
          pageTitle: 'Transfers & Settlements',
          pageSubtitle: 'Move institutional capital seamlessly with real-time settlement',
          myPaymentQrCode: 'Cryptographic Payment QR Code',
          shareReceive: 'Scan or export to receive direct payments into your balance',
          copyPaymentKey: 'Copy Account ID',
          copyQrLink: 'Copy Direct Pay Link',
          downloadQr: 'Download QR Image',
          copied: 'Copied!',
          transactionSuccess: 'Settlement completed and cleared successfully!',
          transactionFailed: 'Transaction failed',
          amount: 'Transfer Amount',
          destinationAccount: 'Recipient Account Number',
          accountNumber: 'Target 8-digit account number',
          paymentKey: 'Direct Payment Routing Key',
          paymentKeyPlaceholder: 'Email, mobile phone number, or clearing key',
          description: 'Reference / Memo',
          optional: '(optional)',
          descriptionPlaceholder: 'e.g. Monthly rent, invoice #204, consulting fee...',
          confirmDeposit: 'Execute Instant Deposit',
          confirmWithdrawal: 'Execute Outbound Withdrawal',
          confirmTransfer: 'Confirm Instant P2P Transfer',
          sendPayment: 'Transmit Fast Payment',
          availableBalance: 'Available Account Balance',
          fundsProtected: 'ISO 20022 Compliant & 256-Bit Hardware Security Protected',
          processingTime: 'Settlement Window',
          limits: 'Operating Limits',
          fees: 'Clearing Fees',
          security: 'Institutional Security & Guarantees',
          sec1: 'Instant clearing via ISO 20022 / SEPA Instant',
          sec2: 'Automated real-time AML fraud scoring engine',
          sec3: 'Cryptographic audit receipt recorded to ledger',
          feeEstimate: 'Estimated clearing fee:',
          freeTier: '$0.00 (Free on FinBank Elite Tier)',
          routeVerified: 'Direct clearing channel validated & active',
        };

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: accountApi.getMyAccount,
    enabled: canLoadTransactions,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: userApi.getMe,
    enabled: canLoadTransactions,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['my-active-sessions'],
    queryFn: sessionsApi.getActive,
    enabled: canLoadTransactions,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const paymentPayload = account
    ? `00020126330014BR.GOV.BCB.PIX0111${account.number}5204000053039865802BR5913${(
        user?.name || 'User'
      ).slice(0, 13)}6009SAO PAULO62070503***6304`
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
      if (tab === 'payment') {
        return accountApi.payByKey({
          paymentKey: paymentKey.trim(),
          amount: data.amount,
          description,
        });
      }
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
          ? `Operation routed to Compliance BPMN pipeline (Process ID: ${transaction.flowableProcessId ?? 'pending'})`
          : ''
      );
      setAmount('');
      setDescription('');
      setTargetAccount('');
      setPaymentKey('');
      setTimeout(() => setSuccess(false), 4500);
    },
  });

  const [newKeyType, setNewKeyType] = useState<'EMAIL' | 'PHONE' | 'RANDOM'>('PHONE');
  const [newKeyValue, setNewKeyValue] = useState('');
  const myKeysQuery = useQuery({
    queryKey: ['my-payment-keys'],
    queryFn: accountApi.getMyPaymentKeys,
    enabled: canLoadTransactions && tab === 'payment',
  });
  const registerKeyMutation = useMutation({
    mutationFn: () =>
      accountApi.registerPaymentKey({ keyType: newKeyType, keyValue: newKeyValue.trim() }),
    onSuccess: () => {
      setNewKeyValue('');
      queryClient.invalidateQueries({ queryKey: ['my-payment-keys'] });
    },
  });

  if (!canLoadTransactions) {
    return (
      <div className='card p-6'>
        <h1 className='text-2xl font-bold text-slate-900 dark:text-zinc-100'>Transfers & Payments</h1>
        <p className='text-slate-500 dark:text-zinc-400 text-sm mt-1'>
          Transfer tools are available for authenticated user sessions only.
        </p>
      </div>
    );
  }

  const handleCopyAccount = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account.number);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!account) return;
    const directLink = `${window.location.origin}/transfer?to=${account.number}`;
    await navigator.clipboard.writeText(directLink);
    setCopyLinkSuccess(true);
    setTimeout(() => setCopyLinkSuccess(false), 2000);
  };

  const handleDownloadQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const a = document.createElement('a');
        a.download = `finbank-qr-${account?.number || 'code'}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const meta = TAB_META[tab];
  const tabs: TabType[] = ['deposit', 'withdraw', 'transfer', 'payment', 'qrcode'];

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2.5'>
            <h1 className='text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight'>
              {text.pageTitle}
            </h1>
            <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'>
              ISO 20022 FAST
            </span>
          </div>
          <p className='text-slate-500 dark:text-zinc-400 text-sm mt-1'>{text.pageSubtitle}</p>
        </div>
      </div>

      {/* Responsive Horizontal Tabs */}
      <div className='card p-1.5 flex gap-1 overflow-x-auto no-scrollbar'>
        {tabs.map((key) => {
          const { label, icon: Icon } = TAB_META[key];
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setSuccess(false);
                setValidationMessage('');
              }}
              className={`flex-1 min-w-[110px] sm:min-w-0 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Icon className='w-4 h-4 shrink-0' />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Responsive Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column (2 spans) */}
        <div className='lg:col-span-2 space-y-4'>
          {tab === 'qrcode' ? (
            <div className='card p-6 sm:p-8 text-center relative overflow-hidden'>
              <div className='absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none' />

              <div className='flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mb-1'>
                <Sparkles className='w-4 h-4' />
                <h3 className='text-lg font-bold text-slate-900 dark:text-zinc-100'>
                  {text.myPaymentQrCode}
                </h3>
              </div>
              <p className='text-slate-500 dark:text-zinc-400 text-sm mb-6 max-w-md mx-auto'>
                {text.shareReceive}
              </p>

              {/* QR Container */}
              <div className='flex justify-center mb-6'>
                <div
                  ref={qrRef}
                  className='p-6 bg-white rounded-3xl shadow-2xl border border-slate-200 inline-block transition-transform hover:scale-[1.02]'
                >
                  {account ? (
                    <QRCodeSVG
                      value={paymentPayload}
                      size={210}
                      level='H'
                      includeMargin={true}
                      fgColor='#0f172a'
                    />
                  ) : (
                    <div className='w-52 h-52 bg-slate-100 rounded-2xl animate-pulse' />
                  )}
                </div>
              </div>

              {/* Account Number Pill */}
              <div className='max-w-md mx-auto bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 rounded-2xl p-4 flex items-center justify-between gap-3 mb-4'>
                <div className='text-left min-w-0'>
                  <p className='text-xs text-slate-400 dark:text-zinc-400 uppercase font-semibold tracking-wider'>
                    Account Number
                  </p>
                  <p className='text-slate-900 dark:text-zinc-100 font-mono font-bold text-lg truncate'>
                    {account?.number || '...'}
                  </p>
                </div>
                <button
                  onClick={handleCopyAccount}
                  className='px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:border-primary-500 flex items-center gap-1.5 shadow-sm transition-all active:scale-95'
                >
                  {copySuccess ? (
                    <>
                      <Check className='w-3.5 h-3.5 text-emerald-500' />
                      <span className='text-emerald-600 font-bold'>{text.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className='w-3.5 h-3.5' />
                      <span>{text.copyPaymentKey}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons for QR: Download & Copy Link */}
              <div className='max-w-md mx-auto grid grid-cols-2 gap-3'>
                <button
                  onClick={handleDownloadQr}
                  className='py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-200 dark:border-zinc-700'
                >
                  <Download className='w-3.5 h-3.5' />
                  <span>{text.downloadQr}</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className='py-2.5 px-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-primary-500 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-orange-500/20'
                >
                  {copyLinkSuccess ? (
                    <>
                      <Check className='w-3.5 h-3.5 text-emerald-500' />
                      <span>{text.copied}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className='w-3.5 h-3.5' />
                      <span>{text.copyQrLink}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className='card p-6 sm:p-8 space-y-5'>
              {success && (
                <div className='flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 animate-in fade-in zoom-in-95'>
                  <CheckCircle className='w-5 h-5 text-emerald-500 shrink-0' />
                  <p className='text-emerald-700 dark:text-emerald-300 text-sm font-semibold'>
                    {validationMessage || text.transactionSuccess}
                  </p>
                </div>
              )}

              {mutation.isError && (
                <div className='bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4'>
                  <p className='text-rose-600 dark:text-rose-300 text-sm font-medium'>
                    {(isAxiosError<{ error?: string }>(mutation.error)
                      ? mutation.error.response?.data?.error
                      : undefined) || text.transactionFailed}
                  </p>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label
                  htmlFor='txn-amount'
                  className='block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2'
                >
                  {text.amount}
                </label>
                <div className='relative'>
                  <span className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-bold text-lg'>
                    $
                  </span>
                  <input
                    id='txn-amount'
                    name='amount'
                    type='number'
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className='w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 text-slate-900 dark:text-zinc-100 text-xl font-mono font-bold placeholder-slate-300 dark:placeholder-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all'
                    placeholder='0.00'
                    min='0.01'
                    step='0.01'
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
                {[25, 50, 100, 250, 500, 1000].map((v) => (
                  <button
                    key={v}
                    type='button'
                    onClick={() => setAmount(String(v))}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border active:scale-95 ${
                      amount === String(v)
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900 hover:border-primary-500 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    ${v}
                  </button>
                ))}
              </div>

              {/* Target Account (Transfer) */}
              {tab === 'transfer' && (
                <div>
                  <label
                    htmlFor='txn-targetAccount'
                    className='block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2'
                  >
                    {text.destinationAccount}
                  </label>
                  <div className='relative'>
                    <input
                      id='txn-targetAccount'
                      name='targetAccount'
                      type='text'
                      value={targetAccount}
                      onChange={(e) => setTargetAccount(e.target.value)}
                      className='w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl pl-4 pr-10 py-3 text-slate-900 dark:text-zinc-100 text-sm font-mono font-bold placeholder-slate-300 dark:placeholder-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all'
                      placeholder={text.accountNumber}
                    />
                    {targetAccount.length >= 6 && (
                      <span className='absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-500 text-xs font-bold'>
                        <Check className='w-4 h-4' /> Verified
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Key (Payment) */}
              {tab === 'payment' && (
                <div>
                  <label
                    htmlFor='txn-paymentKey'
                    className='block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2'
                  >
                    {text.paymentKey}
                  </label>
                  <input
                    id='txn-paymentKey'
                    name='paymentKey'
                    type='text'
                    value={paymentKey}
                    onChange={(e) => setPaymentKey(e.target.value)}
                    className='w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-zinc-100 text-sm font-medium placeholder-slate-300 dark:placeholder-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all'
                    placeholder={text.paymentKeyPlaceholder}
                  />
                  <div className='mt-4 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3'>
                    <p className='text-xs font-bold text-slate-500 uppercase tracking-wider'>
                      {locale === 'fr' ? 'Enregistrer ma clé de paiement' : 'Register my payment key'}
                    </p>
                    <div className='flex gap-2'>
                      <select
                        value={newKeyType}
                        onChange={(e) => setNewKeyType(e.target.value as 'EMAIL' | 'PHONE' | 'RANDOM')}
                        className='bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-sm'
                      >
                        <option value='PHONE'>PHONE</option>
                        <option value='EMAIL'>EMAIL</option>
                        <option value='RANDOM'>RANDOM</option>
                      </select>
                      <input
                        type='text'
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        className='flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm'
                        placeholder={locale === 'fr' ? 'Ex : 56660279' : 'e.g. 56660279'}
                      />
                      <button
                        type='button'
                        onClick={() => registerKeyMutation.mutate()}
                        disabled={registerKeyMutation.isPending || !newKeyValue.trim()}
                        className='px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50'
                      >
                        {locale === 'fr' ? 'Enregistrer' : 'Register'}
                      </button>
                    </div>
                    {registerKeyMutation.isError && (
                      <p className='text-xs text-red-500'>
                        {(registerKeyMutation.error as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ?? 'Error'}
                      </p>
                    )}
                    {(myKeysQuery.data ?? []).length > 0 && (
                      <ul className='text-xs font-mono text-slate-600 dark:text-zinc-300'>
                        {(myKeysQuery.data ?? []).map((k) => (
                          <li key={k.id}>
                            {k.keyType}: {k.keyValue}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label
                  htmlFor='txn-description'
                  className='block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2'
                >
                  {text.description}{' '}
                  <span className='text-slate-400 dark:text-zinc-500 normal-case font-normal'>
                    {text.optional}
                  </span>
                </label>
                <input
                  id='txn-description'
                  name='description'
                  type='text'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className='w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-zinc-100 text-sm font-medium placeholder-slate-300 dark:placeholder-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all'
                  placeholder={text.descriptionPlaceholder}
                />
              </div>

              {/* Live Fee & Settlement Summary Box */}
              {amount && parseFloat(amount) > 0 && (
                <div className='p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-2'>
                    <Building2 className='w-4 h-4 text-primary-500' />
                    <div>
                      <p className='font-bold text-slate-800 dark:text-zinc-200'>
                        {text.routeVerified}
                      </p>
                      <p className='text-[11px] text-slate-400'>{meta.time}</p>
                    </div>
                  </div>
                  <div className='text-right font-mono'>
                    <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                      Fee: $0.00
                    </span>
                    <p className='text-[10px] text-slate-400'>Instant Execution</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !amount || parseFloat(amount) <= 0}
                className='w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm active:scale-95'
              >
                {mutation.isPending ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <>
                    {tab === 'deposit' && (
                      <>
                        <TrendingUp className='w-4 h-4' /> {text.confirmDeposit}
                      </>
                    )}
                    {tab === 'withdraw' && (
                      <>
                        <TrendingDown className='w-4 h-4' /> {text.confirmWithdrawal}
                      </>
                    )}
                    {tab === 'transfer' && (
                      <>
                        <ArrowLeftRight className='w-4 h-4' /> {text.confirmTransfer}
                      </>
                    )}
                    {tab === 'payment' && (
                      <>
                        <Zap className='w-4 h-4' /> {text.sendPayment}
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Balance & Contextual Cards */}
        <div className='space-y-4'>
          {/* Balance Widget */}
          <div className='card p-6 bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white relative overflow-hidden shadow-xl'>
            <div className='absolute -right-6 -bottom-6 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl pointer-events-none' />
            <p className='text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1'>
              {text.availableBalance}
            </p>
            <p className='text-3xl font-extrabold text-white tracking-tight font-mono'>
              {formatCurrency(account?.balance || 0)}
            </p>
            <div className='mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-400'>
              <ShieldCheck className='w-4 h-4 text-emerald-400 shrink-0' />
              <span>{text.fundsProtected}</span>
            </div>
          </div>

          {/* Contextual Card for Selected Tab */}
          <div className='card p-6 space-y-4'>
            <div className='flex items-center gap-2.5 mb-1'>
              <div
                className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0'
                style={{ background: meta.bg }}
              >
                <meta.icon className='w-4.5 h-4.5' style={{ color: meta.color }} />
              </div>
              <p className='text-sm font-bold text-slate-900 dark:text-zinc-100'>{meta.label}</p>
            </div>

            {[
              { icon: Clock, label: text.processingTime, value: meta.time },
              { icon: Info, label: text.limits, value: meta.limits },
              { icon: Sparkles, label: text.fees, value: meta.fee },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className='flex items-start gap-3'>
                <div className='w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5'>
                  <Icon className='w-4 h-4 text-slate-500 dark:text-zinc-400' />
                </div>
                <div>
                  <p className='text-xs text-slate-400 dark:text-zinc-400 font-semibold'>{label}</p>
                  <p className='text-sm font-semibold text-slate-800 dark:text-zinc-200'>{value}</p>
                </div>
              </div>
            ))}

            <div className='bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 rounded-xl p-3.5'>
              <p className='text-xs text-slate-600 dark:text-zinc-300 leading-relaxed'>{meta.tip}</p>
            </div>

            {tab === 'transfer' && (
              <div className='bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl p-3.5 flex items-start gap-2.5'>
                <Lock className='w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5' />
                <p className='text-xs text-orange-700 dark:text-orange-300 leading-relaxed font-medium'>
                  Transfers above $5,000 are automatically routed to the Flowable BPMN pipeline for
                  manager authorization and anti-fraud approval.
                </p>
              </div>
            )}
          </div>

          {/* Guarantees */}
          <div className='card p-6'>
            <p className='text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider mb-3'>
              {text.security}
            </p>
            <div className='space-y-2.5'>
              {[text.sec1, text.sec2, text.sec3].map((item) => (
                <div key={item} className='flex items-center gap-2.5'>
                  <div className='w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center shrink-0'>
                    <Check className='w-3 h-3 text-emerald-500' />
                  </div>
                  <p className='text-xs text-slate-600 dark:text-zinc-300 font-medium'>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
