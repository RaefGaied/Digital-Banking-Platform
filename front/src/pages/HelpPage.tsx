import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Shield,
  CreditCard,
  Zap,
  TrendingUp,
  ArrowRight,
  Clock,
  Sparkles,
  Send,
  Loader2,
  Upload,
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { supportTicketsApi } from '../api/supportTickets';
import type { CreateSupportTicketRequest, SupportTicket } from '../types';

type HelpTopic = { icon: React.ElementType; label: string; description: string; route: string };
type HelpFaq = { question: string; answer: string };

function formatTicketDate(value?: string | null) {
  if (!value) return 'Date indisponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date indisponible' : date.toLocaleString();
}

function isSupportedIdentityDocument(file: File) {
  const extension = file.name.toLowerCase().split('.').pop();
  return ['pdf', 'jpg', 'jpeg', 'png'].includes(extension ?? '') && file.size <= 10 * 1024 * 1024;
}

export default function HelpPage() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [ticketType, setTicketType] = useState('GENERAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [requestedDocument, setRequestedDocument] = useState<File | null>(null);
  const [documentMessage, setDocumentMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ['my-support-tickets'],
    queryFn: () => supportTicketsApi.listMine(0, 20),
    refetchInterval: 30000,
  });

  const createTicketMutation = useMutation({
    mutationFn: (payload: CreateSupportTicketRequest) => supportTicketsApi.create(payload),
    onSuccess: () => {
      setSubject('');
      setDescription('');
      setTicketType('GENERAL');
      setPriority('MEDIUM');
      setAttachment(null);
      setFormMessage(locale === 'fr' ? 'Ticket créé avec succès.' : 'Support ticket opened successfully.');
      void queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] });
    },
    onError: () => {
      setFormMessage(
        locale === 'fr' ? 'Impossible de créer le ticket.' : 'Unable to create the ticket. Please retry.'
      );
    },
  });

  const uploadIdentityDocumentMutation = useMutation({
    mutationFn: ({ ticketId, file }: { ticketId: number; file: File }) =>
      supportTicketsApi.uploadIdentityDocument(ticketId, file),
    onSuccess: () => {
      setRequestedDocument(null);
      setDocumentMessage(
        locale === 'fr'
          ? 'Votre justificatif a été transmis à l’équipe de vérification.'
          : 'Your document has been sent to the verification team.'
      );
      void queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] });
    },
    onError: () => {
      setDocumentMessage(
        locale === 'fr'
          ? 'Le justificatif n’a pas pu être transmis. Vérifiez le fichier et réessayez.'
          : 'The document could not be uploaded. Check the file and try again.'
      );
    },
  });

  const downloadAttachment = async (ticket: SupportTicket) => {
    try {
      const file = await supportTicketsApi.downloadAttachment(ticket.id);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = ticket.attachmentName || `ticket-${ticket.id}-attachment`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setDocumentMessage(
        locale === 'fr' ? 'Impossible de télécharger le justificatif.' : 'Unable to download the document.'
      );
    }
  };

  const ticketTypeChoices = useMemo(
    () =>
      locale === 'fr'
        ? [
            { value: 'GENERAL', label: 'Général' },
            { value: 'CLAIM', label: 'Réclamation' },
            { value: 'FRAUD', label: 'Fraude / Sécurité' },
            { value: 'DATA_UPDATE', label: 'Mise à jour données' },
          ]
        : [
            { value: 'GENERAL', label: 'General Inquiry' },
            { value: 'CLAIM', label: 'Dispute / Claim' },
            { value: 'FRAUD', label: 'Security Alert / Fraud' },
            { value: 'DATA_UPDATE', label: 'Personal Data Update' },
          ],
    [locale]
  );

  const text =
    locale === 'fr'
      ? {
          title: 'Aide & Assistance',
          subtitle: 'Comment pouvons-nous vous aider aujourd’hui ?',
          browseByTopic: 'Parcourir par thématique',
          faqTitle: 'Questions fréquentes',
          questions: 'questions',
          contactUs: 'Nous contacter',
          quickLinks: 'Liens rapides',
          systemStatus: 'Disponibilité du système',
          operational: 'Opérationnel',
          down: 'Indisponible',
          updatedNow: 'Vérifié à l’instant',
        }
      : {
          title: 'Help & Knowledge Center',
          subtitle: 'Quick answers, instant support tickets, and banking guides',
          browseByTopic: 'Browse by Banking Topic',
          faqTitle: 'Frequently Asked Questions',
          questions: 'questions',
          contactUs: 'Get in Touch',
          quickLinks: 'Quick Links',
          systemStatus: 'Platform Status',
          operational: 'Operational',
          down: 'Service Down',
          updatedNow: 'Verified just now',
        };

  const faqs: HelpFaq[] =
    locale === 'fr'
      ? [
          {
            question: 'Comment effectuer un virement instantané ?',
            answer:
              'Rendez-vous dans la section Virements & Paiements, sélectionnez votre onglet préféré (Virement ou Clé de paiement), indiquez le montant puis confirmez.',
          },
          {
            question: 'Comment ajouter une nouvelle carte bancaire ?',
            answer:
              'Accédez à la section Mes Cartes puis cliquez sur Ajouter une carte. Renseignez la marque, les 4 derniers chiffres et la date d’expiration.',
          },
          {
            question: 'Comment fonctionne la simulation d’investissement ?',
            answer:
              'Le système calcule les intérêts composés jour après jour selon le rendement annuel sélectionné. Vous pouvez racheter votre capital à tout instant.',
          },
          {
            question: 'Mes fonds et données sont-ils protégés ?',
            answer:
              'Oui. Chaque opération financière est chiffrée selon le standard TLS 256 bits et auditée en continu par notre moteur anti-fraude intelligent.',
          },
          {
            question: 'Comment partager mon QR Code de paiement ?',
            answer:
              'Dans Virements & Paiements, ouvrez l’onglet QR Code pour faire scanner votre code ou copier vos coordonnées de compte en un clic.',
          },
        ]
      : [
          {
            question: 'How do I initiate a fee-free instant transfer?',
            answer:
              'Navigate to Transfers & Payments, choose your preferred destination mode (Account Number or Instant Payment Key), enter the amount, and confirm.',
          },
          {
            question: 'How do I add a new card to my wallet?',
            answer:
              'Go to the My Cards page and click "Add Card". Enter your cardholder name, last 4 digits, expiration date, and optional credit limit.',
          },
          {
            question: 'How does the investment compounding work?',
            answer:
              'All investment options accrue compound returns continuously based on their annual yield rate. You can redeem your investment back to your main balance anytime.',
          },
          {
            question: 'Is my money and personal data protected?',
            answer:
              'Absolutely. FinBank utilizes 256-bit TLS bank-level encryption, multi-factor authentication, and automated real-time BPMN audit logs.',
          },
          {
            question: 'How do I share my payment QR Code with others?',
            answer:
              'Select Transfers & Payments and click the QR Code tab to display your high-contrast QR code for instant scan-and-pay.',
          },
        ];

  const topics: HelpTopic[] =
    locale === 'fr'
      ? [
          {
            icon: CreditCard,
            label: 'Cartes & Paiements',
            description: 'Gestion, plafonds et blocage',
            route: '/cards',
          },
          {
            icon: Zap,
            label: 'Virements & Clés',
            description: 'Virements instantanés et QR',
            route: '/transactions?tab=payment',
          },
          {
            icon: TrendingUp,
            label: 'Investissements',
            description: 'Produits, rendements et retraits',
            route: '/invest',
          },
          {
            icon: Shield,
            label: 'Sécurité & 2FA',
            description: 'Mot de passe et authentification',
            route: '/profile',
          },
          {
            icon: FileText,
            label: 'Relevés de compte',
            description: 'Historique et téléchargements',
            route: '/history',
          },
          {
            icon: MessageCircle,
            label: 'Sessions IA',
            description: 'Assistance intelligente FinBank',
            route: '/sessions',
          },
        ]
      : [
          {
            icon: CreditCard,
            label: 'Cards & Wallets',
            description: 'Limits, virtual cards & freeze',
            route: '/cards',
          },
          {
            icon: Zap,
            label: 'Transfers & QR Pay',
            description: 'Instant keys and remittances',
            route: '/transactions?tab=payment',
          },
          {
            icon: TrendingUp,
            label: 'Investments',
            description: 'Yield rates, bonds & redemption',
            route: '/invest',
          },
          {
            icon: Shield,
            label: 'Security & 2FA',
            description: 'Password, encryption & locks',
            route: '/profile',
          },
          {
            icon: FileText,
            label: 'Statements & Ledger',
            description: 'Transaction history and exports',
            route: '/history',
          },
          {
            icon: MessageCircle,
            label: 'AI Banking Agent',
            description: 'Automated guidance and assistance',
            route: '/sessions',
          },
        ];

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight'>
          {text.title}
        </h1>
        <p className='text-slate-500 dark:text-zinc-400 text-sm mt-1'>{text.subtitle}</p>
      </div>

      {/* Responsive Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* ── LEFT COLUMN (2 cols) ── */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Topics Grid */}
          <div className='card p-6 sm:p-7'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-base sm:text-lg mb-4'>
              {text.browseByTopic}
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5'>
              {topics.map(({ icon: Icon, label, description, route }) => (
                <button
                  key={label}
                  type='button'
                  onClick={() => route && navigate(route)}
                  className='flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-orange-500/10 border border-slate-200/80 dark:border-zinc-700/60 hover:border-primary-500/40 transition-all text-center group cursor-pointer'
                >
                  <div className='w-11 h-11 rounded-2xl bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform'>
                    <Icon className='w-5 h-5 text-primary-500' />
                  </div>
                  <p className='text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100'>{label}</p>
                  <p className='text-[11px] text-slate-400 dark:text-zinc-500 leading-tight'>{description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className='card p-6 sm:p-7'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-base sm:text-lg'>
                {text.faqTitle}
              </h3>
              <span className='text-xs font-bold text-primary-500 bg-orange-500/10 px-3 py-1 rounded-full'>
                {faqs.length} {text.questions}
              </span>
            </div>

            <div className='space-y-2.5'>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`rounded-2xl overflow-hidden border transition-all ${
                    openFaq === i
                      ? 'border-primary-500/40 bg-orange-500/5'
                      : 'border-slate-200/80 dark:border-zinc-800'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className='w-full flex items-center justify-between p-4 text-left transition-colors'
                  >
                    <p className='text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 pr-4'>
                      {faq.question}
                    </p>
                    {openFaq === i ? (
                      <ChevronUp className='w-4 h-4 text-primary-500 shrink-0' />
                    ) : (
                      <ChevronDown className='w-4 h-4 text-slate-400 shrink-0' />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className='px-4 pb-4 pt-1 border-t border-slate-100 dark:border-zinc-800/80'>
                      <p className='text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed'>
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (1 col) ── */}
        <div className='space-y-6'>
          {/* Create Support Ticket Form */}
          <div className='card p-6'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-base mb-4 flex items-center gap-2'>
              <Sparkles className='w-4 h-4 text-primary-500' />
              {locale === 'fr' ? 'Ouvrir un ticket d’assistance' : 'Open Support Ticket'}
            </h3>

            <div className='space-y-3.5'>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={locale === 'fr' ? 'Sujet de votre demande' : 'Subject of inquiry'}
                className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:border-primary-500'
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={locale === 'fr' ? 'Détaillez votre question ou problème...' : 'Describe your request in detail...'}
                rows={4}
                className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:border-primary-500 resize-none'
              />
              <div className='grid grid-cols-2 gap-2.5'>
                <select
                  value={ticketType}
                  onChange={(event) => setTicketType(event.target.value)}
                  className='w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-primary-500'
                >
                  {ticketTypeChoices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className='w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-primary-500'
                >
                  <option value='LOW'>{locale === 'fr' ? 'Priorité Basse' : 'Low Priority'}</option>
                  <option value='MEDIUM'>{locale === 'fr' ? 'Priorité Moyenne' : 'Medium Priority'}</option>
                  <option value='HIGH'>{locale === 'fr' ? 'Priorité Haute' : 'High Priority'}</option>
                </select>
              </div>
              {ticketType === 'DATA_UPDATE' && (
                <div className='rounded-xl border border-slate-200 dark:border-zinc-700 p-3'>
                  <label className='block text-xs font-semibold text-slate-700 dark:text-zinc-300'>
                    {locale === 'fr'
                      ? 'Joindre une copie de votre pièce d’identité (facultatif)'
                      : 'Attach a copy of your identity document (optional)'}
                    <input
                      type='file'
                      accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (file && !isSupportedIdentityDocument(file)) {
                          setAttachment(null);
                          setDocumentMessage(
                            locale === 'fr'
                              ? 'Choisissez un fichier PDF, JPG ou PNG de 10 Mo maximum.'
                              : 'Choose a PDF, JPG, or PNG file up to 10 MB.'
                          );
                          event.target.value = '';
                          return;
                        }
                        setAttachment(file);
                        setDocumentMessage(null);
                      }}
                      className='mt-2 block w-full text-xs text-slate-600 dark:text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-orange-700'
                    />
                  </label>
                  <p className='mt-1 text-[10px] text-slate-500 dark:text-zinc-500'>
                    {locale === 'fr' ? 'Formats acceptés : PDF, JPG, PNG · 10 Mo maximum.' : 'Accepted formats: PDF, JPG, PNG · 10 MB maximum.'}
                  </p>
                  {attachment && (
                    <p className='mt-1 text-[10px] text-slate-600 dark:text-zinc-400'>{attachment.name}</p>
                  )}
                  {documentMessage && (
                    <p className='mt-1 text-[10px] text-red-600 dark:text-red-400'>{documentMessage}</p>
                  )}
                </div>
              )}

              <button
                type='button'
                disabled={createTicketMutation.isPending || !subject.trim() || !description.trim()}
                onClick={() =>
                  createTicketMutation.mutate({ subject, description, ticketType, priority, attachment })
                }
                className='w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white py-3 text-xs sm:text-sm font-bold disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2'
              >
                {createTicketMutation.isPending ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <>
                    <Send className='w-4 h-4' />{' '}
                    {locale === 'fr' ? 'Soumettre le ticket' : 'Submit Ticket'}
                  </>
                )}
              </button>

              {formMessage && (
                <p className='text-xs text-emerald-600 dark:text-emerald-400 font-semibold text-center'>
                  {formMessage}
                </p>
              )}

              {/* User tickets list if any */}
              {Boolean(ticketsQuery.data?.content?.length) && (
                <div className='mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-2'>
                  <p className='text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider'>
                    {locale === 'fr' ? 'Vos tickets récents' : 'Your Recent Tickets'} ({ticketsQuery.data?.totalElements ?? 0})
                  </p>
                  <div className='space-y-1.5 max-h-48 overflow-y-auto pr-1'>
                    {ticketsQuery.data?.content.slice(0, 5).map((ticket: SupportTicket) => (
                      <div
                        key={ticket.id}
                        className='rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/50 dark:border-zinc-800 text-xs'
                      >
                        <button
                          type='button'
                          aria-expanded={expandedTicketId === ticket.id}
                          onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id)}
                          className='flex w-full items-center justify-between gap-2 p-2 text-left'
                        >
                          <span className='min-w-0 pr-2'>
                            <span className='block truncate font-semibold text-slate-900 dark:text-zinc-100'>{ticket.subject}</span>
                            <span className='block text-[10px] text-slate-400 dark:text-zinc-500'>#{ticket.id} · {formatTicketDate(ticket.createdAt)}</span>
                          </span>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {ticket.status}
                          </span>
                        </button>
                        {expandedTicketId === ticket.id && (
                          <div className='border-t border-slate-200/70 dark:border-zinc-700 px-3 py-2.5'>
                            <p className='font-semibold text-slate-700 dark:text-zinc-300'>
                              {ticket.ticketType} · {ticket.priority}
                            </p>
                            <p className='mt-1 whitespace-pre-wrap text-slate-600 dark:text-zinc-400'>
                              {ticket.description || (locale === 'fr' ? 'Aucune description fournie.' : 'No description provided.')}
                            </p>
                            {ticket.attachmentName && (
                              <button
                                type='button'
                                onClick={() => void downloadAttachment(ticket)}
                                className='mt-2 flex items-center gap-1 font-semibold text-primary-600 hover:underline dark:text-primary-400'
                              >
                                <FileText className='h-3.5 w-3.5' />
                                {locale === 'fr' ? 'Télécharger le justificatif' : 'Download attachment'}
                                <span className='font-normal'>({ticket.attachmentName})</span>
                              </button>
                            )}
                            {ticket.awaitingIdentityDocument && (
                              <div className='mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/50 dark:bg-orange-950/20'>
                                <p className='text-xs font-semibold text-orange-900 dark:text-orange-200'>
                                  {locale === 'fr'
                                    ? 'Un justificatif d’identité est demandé pour poursuivre la vérification.'
                                    : 'An identity document is required to continue the review.'}
                                </p>
                                <label className='mt-2 block text-[11px] font-medium text-slate-700 dark:text-zinc-300'>
                                  {locale === 'fr' ? 'Choisir un fichier PDF, JPG ou PNG (10 Mo maximum)' : 'Choose a PDF, JPG, or PNG file (up to 10 MB)'}
                                  <input
                                    type='file'
                                    accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
                                    onChange={(event) => {
                                      const file = event.target.files?.[0] ?? null;
                                      if (file && !isSupportedIdentityDocument(file)) {
                                        setRequestedDocument(null);
                                        setDocumentMessage(
                                          locale === 'fr'
                                            ? 'Choisissez un fichier PDF, JPG ou PNG de 10 Mo maximum.'
                                            : 'Choose a PDF, JPG, or PNG file up to 10 MB.'
                                        );
                                        event.target.value = '';
                                        return;
                                      }
                                      setRequestedDocument(file);
                                      setDocumentMessage(null);
                                    }}
                                    className='mt-1 block w-full text-xs text-slate-600 dark:text-zinc-400'
                                  />
                                </label>
                                {requestedDocument && (
                                  <p className='mt-1 text-[10px] text-slate-600 dark:text-zinc-400'>
                                    {requestedDocument.name}
                                  </p>
                                )}
                                <button
                                  type='button'
                                  disabled={!requestedDocument || uploadIdentityDocumentMutation.isPending}
                                  onClick={() => {
                                    if (!requestedDocument) return;
                                    setDocumentMessage(null);
                                    uploadIdentityDocumentMutation.mutate({
                                      ticketId: ticket.id,
                                      file: requestedDocument,
                                    });
                                  }}
                                  className='mt-2 inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50'
                                >
                                  {uploadIdentityDocumentMutation.isPending
                                    ? <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                    : <Upload className='h-3.5 w-3.5' />}
                                  {locale === 'fr' ? 'Transmettre le justificatif' : 'Upload document'}
                                </button>
                                {documentMessage && (
                                  <p className='mt-2 text-[11px] text-slate-700 dark:text-zinc-300'>
                                    {documentMessage}
                                  </p>
                                )}
                              </div>
                            )}
                            {ticket.status === 'RESOLVED'
                              && ticket.ticketType === 'DATA_UPDATE'
                              && /email|e-mail|courriel|adresse\s+e|modif(?:ier|er)\s+mon\s+email/i.test(
                                `${ticket.subject ?? ''} ${ticket.description ?? ''}`
                              ) && (
                                <div className='mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-emerald-800 dark:text-emerald-300'>
                                  {locale === 'fr'
                                    ? 'Vérification approuvée : votre adresse n’a pas changé automatiquement. Terminez la modification dans Profil > Compléter la modification de l’e-mail.'
                                    : 'Verification approved: your email was not changed automatically. Finish the change in Profile > Complete email change.'}
                                  <button
                                    type='button'
                                    onClick={() => navigate('/profile')}
                                    className='ml-1 font-bold underline'
                                  >
                                    {locale === 'fr' ? 'Ouvrir le profil' : 'Open Profile'}
                                  </button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Direct Channels */}
          <div className='card p-6'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-sm uppercase tracking-wider mb-4'>
              {text.contactUs}
            </h3>
            <div className='space-y-2.5'>
              {[
                { icon: MessageCircle, label: 'Live AI Support', sub: 'Instant 24/7 assistance', bg: '#fff7ed', color: '#e8611a', route: '/sessions' },
                { icon: Phone, label: 'Priority Phone', sub: '+1 (800) 888-BANK', bg: '#ecfdf5', color: '#10b981' },
                { icon: Mail, label: 'Concierge Email', sub: 'support@finbank.io', bg: '#eff6ff', color: '#3b82f6' },
              ].map(({ icon: Icon, label, sub, bg, color, route }) => (
                <button
                  key={label}
                  type='button'
                  onClick={() => route && navigate(route)}
                  className='w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-orange-500/5 border border-slate-200/60 dark:border-zinc-800 transition-all group'
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0' style={{ background: bg }}>
                      <Icon className='w-4.5 h-4.5' style={{ color }} />
                    </div>
                    <div className='text-left'>
                      <p className='text-xs font-bold text-slate-900 dark:text-zinc-100'>{label}</p>
                      <p className='text-[11px] text-slate-400 dark:text-zinc-500'>{sub}</p>
                    </div>
                  </div>
                  <ArrowRight className='w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors' />
                </button>
              ))}
            </div>
          </div>

          {/* System Health Status */}
          <div className='card p-6'>
            <h3 className='font-bold text-slate-900 dark:text-zinc-100 text-sm uppercase tracking-wider mb-4'>
              {text.systemStatus}
            </h3>
            <div className='space-y-3'>
              {[
                { label: 'Core Banking API & Balances', ok: true },
                { label: 'Instant Payment Settlement', ok: true },
                { label: 'Investment Yield Engine', ok: true },
                { label: '2FA & Authentication Gateways', ok: true },
              ].map(({ label, ok }) => (
                <div key={label} className='flex items-center justify-between text-xs'>
                  <span className='text-slate-600 dark:text-zinc-300 font-medium'>{label}</span>
                  <div className='flex items-center gap-1.5'>
                    <div className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className={`font-bold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {ok ? text.operational : text.down}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className='mt-4 pt-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 font-medium'>
              <Clock className='w-3.5 h-3.5' />
              <span>{text.updatedNow}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}