import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, MessageCircle, Phone, Mail,
  FileText, Shield, CreditCard, Zap, TrendingUp,
  ArrowRight, Clock,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

type HelpTopic = { icon: React.ElementType; label: string; description: string; route: string };
type HelpFaq = { question: string; answer: string };

export default function HelpPage() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const text = locale === 'fr'
    ? {
        title: 'Aide et support',
        subtitle: "Comment pouvons-nous vous aider aujourd'hui ?",
        browseByTopic: 'Parcourir par sujet',
        faqTitle: 'Questions frequentes',
        questions: 'questions',
        contactUs: 'Nous contacter',
        quickLinks: 'Liens rapides',
        systemStatus: 'Etat du systeme',
        operational: 'Operationnel',
        down: 'Indisponible',
        updatedNow: 'Mis a jour a l\'instant',
      }
    : {
        title: 'Help & Support',
        subtitle: 'How can we help you today?',
        browseByTopic: 'Browse by topic',
        faqTitle: 'Frequently Asked Questions',
        questions: 'questions',
        contactUs: 'Contact us',
        quickLinks: 'Quick links',
        systemStatus: 'System status',
        operational: 'Operational',
        down: 'Down',
        updatedNow: 'Updated just now',
      };

  const faqs: HelpFaq[] = locale === 'fr'
    ? [
        {
          question: 'Comment effectuer un virement PIX ?',
          answer: 'Allez dans Virements & Paiements, choisissez l\'onglet PIX, saisissez la cle PIX du destinataire (email, telephone ou cle aleatoire), le montant et confirmez.',
        },
        {
          question: 'Comment ajouter une nouvelle carte ?',
          answer: 'Allez dans Mes cartes puis cliquez sur Ajouter une carte. Remplissez le type, la marque, les 4 derniers chiffres et la date d\'expiration.',
        },
        {
          question: "Comment fonctionne la simulation d'investissement ?",
          answer: 'Le systeme applique un interet compose journalier base sur le taux annuel du produit choisi. Vous pouvez racheter a tout moment et la valeur courante est creditee sur votre compte.',
        },
        {
          question: 'Mon argent est-il en securite ?',
          answer: 'Oui. Toutes les transactions sont chiffrees en SSL 256 bits. Vos donnees sont protegees et les operations sont journalisees.',
        },
        {
          question: 'Comment partager mon QR Code PIX ?',
          answer: 'Allez dans Virements & Paiements et ouvrez l\'onglet QR Code. Vous verrez votre QR Code personnalise a partager pour recevoir des paiements instantanes.',
        },
        {
          question: 'Comment voir mon historique de transactions ?',
          answer: 'Cliquez sur Historique dans la barre laterale. Vous pouvez filtrer par type et rechercher par description ou montant.',
        },
      ]
    : [
        {
          question: 'How do I make a PIX transfer?',
          answer: "Go to Transfer & Payments, select the PIX tab, enter the recipient's PIX key (email, phone or random key), enter the amount and confirm.",
        },
        {
          question: 'How do I add a new card?',
          answer: 'Navigate to My Cards and click "Add Card". Fill in the card details including type, brand, last four digits and expiry date.',
        },
        {
          question: 'How does the investment simulation work?',
          answer: 'When you invest, the system applies a daily compound interest rate based on the annual rate of the chosen product. You can redeem at any time and the current value will be credited to your account.',
        },
        {
          question: 'Is my money safe?',
          answer: 'Yes! All transactions are encrypted with 256-bit SSL. Your data is protected and all operations are logged in our audit system.',
        },
        {
          question: 'How do I share my PIX QR Code?',
          answer: 'Go to Transfer & Payments and click on the QR Code tab. You will see your personalized QR Code that you can share to receive payments instantly.',
        },
        {
          question: 'How do I view my transaction history?',
          answer: 'Click on "History" in the sidebar. You can filter by type (deposits, withdrawals, transfers) and search by description or amount.',
        },
      ];

  const topics: HelpTopic[] = locale === 'fr'
    ? [
        { icon: CreditCard,    label: 'Cartes',             description: 'Ajouter, gerer et bloquer des cartes', route: '/cards' },
        { icon: Zap,           label: 'PIX et virements',   description: 'Cles, QR codes et virements', route: '/transactions?tab=pix' },
        { icon: TrendingUp,    label: 'Investissements',    description: 'Produits, rendements et rachats', route: '/invest' },
        { icon: Shield,        label: 'Securite',           description: 'Mot de passe, 2FA et protection', route: '/profile' },
        { icon: FileText,      label: 'Releves',            description: 'Historique et rapports', route: '/history' },
        { icon: MessageCircle, label: 'Autres sujets',      description: 'Questions generales', route: '' },
      ]
    : [
        { icon: CreditCard,    label: 'Cards',           description: 'Add, manage and block cards',      route: '/cards' },
        { icon: Zap,           label: 'PIX & Transfers', description: 'Keys, QR codes and transfers',     route: '/transactions?tab=pix' },
        { icon: TrendingUp,    label: 'Investments',     description: 'Products, returns and redemptions', route: '/invest' },
        { icon: Shield,        label: 'Security',        description: 'Password, 2FA and protection',     route: '/profile' },
        { icon: FileText,      label: 'Statements',      description: 'History and reports',              route: '/history' },
        { icon: MessageCircle, label: 'Other topics',    description: 'General questions',               route: '' },
      ];

  return (
    <div className='space-y-6'>

      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-dark-800'>{text.title}</h1>
        <p className='text-gray-400 text-sm mt-1'>{text.subtitle}</p>
      </div>

      <div className='grid grid-cols-3 gap-6'>

        {/* ── COLUNA ESQUERDA (2/3) ── */}
        <div className='col-span-2 space-y-6'>

          {/* Topics */}
          <div className='card p-6'>
            <h3 className='font-semibold text-dark-800 mb-4'>{text.browseByTopic}</h3>
            <div className='grid grid-cols-3 gap-3'>
              {topics.map(({ icon: Icon, label, description, route }) => (
                <button key={label}
                  onClick={() => route && navigate(route)}
                  className='flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-100 hover:bg-primary-50 border border-cream-200 hover:border-primary-200 transition-all text-center group'>
                  <div className='w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow'>
                    <Icon className='w-5 h-5 text-primary-500' />
                  </div>
                  <p className='text-sm font-medium text-dark-800'>{label}</p>
                  <p className='text-xs text-gray-400'>{description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className='card p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-semibold text-dark-800'>{text.faqTitle}</h3>
              <span className='text-xs text-gray-400 bg-cream-100 px-2.5 py-1 rounded-full'>{faqs.length} {text.questions}</span>
            </div>
            <div className='space-y-2'>
              {faqs.map((faq, i) => (
                <div key={i} className={`rounded-xl overflow-hidden border transition-colors ${
                  openFaq === i ? 'border-primary-200 bg-primary-50/30' : 'border-cream-200'
                }`}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className='w-full flex items-center justify-between p-4 text-left transition-colors'>
                    <p className='text-sm font-medium text-dark-800 pr-4'>{faq.question}</p>
                    {openFaq === i
                      ? <ChevronUp className='w-4 h-4 text-primary-500 shrink-0' />
                      : <ChevronDown className='w-4 h-4 text-gray-400 shrink-0' />}
                  </button>
                  {openFaq === i && (
                    <div className='px-4 pb-4 border-t border-primary-100'>
                      <p className='text-sm text-gray-500 pt-3 leading-relaxed'>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA (1/3) ── */}
        <div className='space-y-4'>

          {/* Contact options */}
          <div className='card p-5'>
            <h3 className='font-semibold text-dark-800 mb-4'>{text.contactUs}</h3>
            <div className='space-y-3'>
              {[
                { icon: MessageCircle, label: 'Live Chat', sub: 'Available 24/7', color: '#e8611a', bg: '#fff7ed' },
                { icon: Phone,         label: 'Phone',     sub: '0800 123 4567',  color: '#16a34a', bg: '#f0fdf4' },
                { icon: Mail,          label: 'Email',     sub: 'support@vaultly.com', color: '#2563eb', bg: '#eff6ff' },
              ].map(({ icon: Icon, label, sub, color, bg }) => (
                <button key={label}
                  className='w-full flex items-center justify-between p-3.5 rounded-xl bg-cream-100 hover:bg-primary-50 border border-cream-200 hover:border-primary-200 transition-all group'>
                  <div className='flex items-center gap-3'>
                    <div className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0' style={{ background: bg }}>
                      <Icon className='w-4 h-4' style={{ color }} />
                    </div>
                    <div className='text-left'>
                      <p className='text-sm font-medium text-dark-800'>{label}</p>
                      <p className='text-xs text-gray-400'>{sub}</p>
                    </div>
                  </div>
                  <ArrowRight className='w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors' />
                </button>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className='card p-5'>
            <h3 className='font-semibold text-dark-800 mb-4'>{text.quickLinks}</h3>
            <div className='space-y-1'>
              {[
                { label: 'My Cards',        route: '/cards' },
                { label: 'PIX & Transfers', route: '/transactions?tab=pix' },
                { label: 'Investments',     route: '/invest' },
                { label: 'Analytics',       route: '/analytics' },
                { label: 'My Profile',      route: '/profile' },
              ].map(({ label, route }) => (
                <button key={label} onClick={() => navigate(route)}
                  className='w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-cream-100 transition-colors group text-left'>
                  <span className='text-sm text-dark-800'>{label}</span>
                  <ArrowRight className='w-3.5 h-3.5 text-gray-300 group-hover:text-primary-500 transition-colors' />
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className='card p-5'>
            <h3 className='font-semibold text-dark-800 mb-4'>{text.systemStatus}</h3>
            <div className='space-y-3'>
              {[
                { label: 'API & Transactions', ok: true },
                { label: 'PIX Network',        ok: true },
                { label: 'Investments',        ok: true },
                { label: 'Notifications',      ok: true },
              ].map(({ label, ok }) => (
                <div key={label} className='flex items-center justify-between'>
                  <span className='text-sm text-gray-500'>{label}</span>
                  <div className='flex items-center gap-1.5'>
                    <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className={`text-xs font-medium ${ok ? 'text-green-600' : 'text-red-500'}`}>
                      {ok ? text.operational : text.down}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className='mt-4 pt-3 border-t border-cream-200 flex items-center gap-1.5 text-xs text-gray-400'>
              <Clock className='w-3 h-3' />
              {text.updatedNow}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}