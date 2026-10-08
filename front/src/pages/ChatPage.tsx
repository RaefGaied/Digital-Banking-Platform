import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../api/messages';
import { sessionsApi } from '../api/sessions';
import { agentsApi } from '../api/agents';
import { aiApi } from '../api/ai';
import axios from 'axios';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Bot,
  User,
  Sparkles,
  Shield,
  Cpu,
  Zap,
  RefreshCw,
  FileText,
  CreditCard,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type ChatMessage = {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
  detectedLang?: string;
};

const SUGGESTED_PROMPTS = [
  { label: 'Solde & Comptes', prompt: 'Quel est mon solde actuel et le résumé de mes comptes ?', icon: CreditCard },
  { label: 'Virement Rapide', prompt: 'Je souhaite faire un virement instantané de 150 €', icon: Zap },
  { label: 'Architecture Sensitive Line', prompt: 'Comment fonctionne la Sensitive Line et le seuil de 5 000 € ?', icon: Shield },
  { label: 'Dernières Opérations', prompt: 'Affiche mes 5 dernières transactions avec statut', icon: FileText },
  { label: 'Plafonds de Carte', prompt: 'Quels sont les plafonds de paiement et de retrait de ma carte ?', icon: HelpCircle },
];

export default function ChatPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const promptParam = searchParams.get('prompt') ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [input, setInput] = useState(promptParam);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // If no session ID in route, fetch user's sessions to automatically connect
  const mySessionsQuery = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => sessionsApi.listMine(),
    enabled: !id,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => sessionsApi.create({}),
    onSuccess: (newSession) => {
      void queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
      navigate(`/chat/${newSession.id}${promptParam ? `?prompt=${encodeURIComponent(promptParam)}` : ''}`, { replace: true });
    },
  });

  // Automatically select the latest active session if no ID was provided
  useEffect(() => {
    if (!id && mySessionsQuery.data) {
      if (mySessionsQuery.data.length > 0) {
        const active =
          mySessionsQuery.data.find((s) => s.status === 'ACTIVE' || s.status === 'OPENED') ??
          mySessionsQuery.data[0];
        navigate(`/chat/${active.id}${promptParam ? `?prompt=${encodeURIComponent(promptParam)}` : ''}`, { replace: true });
      }
    }
  }, [id, mySessionsQuery.data, navigate, promptParam]);

  const sessionId = id ?? '';

  const sessionQuery = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi.getById(sessionId),
    enabled: !!sessionId,
  });

  const conversationQuery = useQuery({
    queryKey: ['conversation', sessionId],
    queryFn: () => messagesApi.getConversation(sessionId),
    enabled: !!sessionId,
    refetchInterval: 6000,
  });

  const agentQuery = useQuery({
    queryKey: ['agent-session', sessionId],
    queryFn: () => agentsApi.getBySession(sessionId),
    enabled: !!sessionId,
    retry: false,
  });

  const activityQuery = useQuery({
    queryKey: ['agent-activity', sessionId],
    queryFn: () => agentsApi.getActivityBySession(sessionId),
    enabled: !!sessionId,
    retry: false,
  });

  const aiAskMutation = useMutation({
    mutationFn: (question: string) => aiApi.ask(question),
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => messagesApi.create(sessionId, { content }),
    onSuccess: (_, content) => {
      void queryClient.invalidateQueries({ queryKey: ['conversation', sessionId] });
      void queryClient.invalidateQueries({ queryKey: ['agent-session', sessionId] });
      void queryClient.invalidateQueries({ queryKey: ['agent-activity', sessionId] });
      void aiAskMutation.mutateAsync(content);
      setInput('');
    },
  });

  useEffect(() => {
    if (!sendMutation.isPending) {
      setThinkingSeconds(0);
      return;
    }

    setThinkingSeconds(0);
    const timer = window.setInterval(() => {
      setThinkingSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sendMutation.isPending]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationQuery.data, sendMutation.isPending]);

  // Loading / Session Resolution Screen
  if (!sessionId) {
    return (
      <div className='flex items-center justify-center min-h-[65vh] p-4'>
        <div className='relative max-w-md w-full rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-8 text-center shadow-2xl'>
          <div className='w-20 h-20 mx-auto rounded-3xl ai-halo-orbit flex items-center justify-center bg-gradient-to-tr from-orange-500 to-amber-500 shadow-xl mb-6'>
            <Bot className='w-10 h-10 text-white animate-pulse' />
          </div>
          <h2 className='text-xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight'>
            Connexion à l’Assistant Bancaire
          </h2>
          <p className='text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed'>
            Initialisation de votre session sécurisée et synchronisation de vos comptes en cours...
          </p>

          <div className='flex justify-center items-center gap-1.5 my-6'>
            <div className='ai-wave-bar' />
            <div className='ai-wave-bar' />
            <div className='ai-wave-bar' />
            <div className='ai-wave-bar' />
            <div className='ai-wave-bar' />
          </div>

          <div className='flex flex-col gap-2.5'>
            <button
              type='button'
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending}
              className='w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold px-4 py-3 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50'
            >
              <Zap className='w-4 h-4' />
              <span>{createSessionMutation.isPending ? 'Initialisation...' : 'Démarrer une Nouvelle Session'}</span>
            </button>
            <button
              type='button'
              onClick={() => navigate('/sessions')}
              className='w-full rounded-2xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold px-4 py-2.5 text-xs transition-colors'
            >
              Gérer toutes les sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const messages: ChatMessage[] = conversationQuery.data ?? [];
  const agent = agentQuery.data;
  const activity = activityQuery.data ?? [];
  const latestActivity = activity[activity.length - 1];

  const pendingAction =
    agent && typeof agent.context === 'object' && agent.context !== null && 'pendingToolAction' in agent.context
      ? String((agent.context as Record<string, unknown>).pendingToolAction)
      : null;

  const pendingArguments =
    agent && typeof agent.context === 'object' && agent.context !== null && 'pendingToolArguments' in agent.context
      ? ((agent.context as Record<string, unknown>).pendingToolArguments as Record<string, unknown> | null)
      : null;

  const pendingConfirmationLabel =
    pendingAction === 'confirm_transfer'
      ? 'Virement Instantané en attente de confirmation sécurisée'
      : pendingAction
      ? `Action bancaire requise : ${pendingAction}`
      : null;

  const pendingConfirmationDetails =
    pendingAction === 'confirm_transfer' && pendingArguments
      ? `Montant : ${pendingArguments.amount ?? 'N/A'} EUR · Bénéficiaire : ${pendingArguments.targetAccountNumber ?? 'N/A'}`
      : pendingArguments
      ? JSON.stringify(pendingArguments)
      : null;

  const getDecisionBadge = (decision?: string) => {
    switch (decision) {
      case 'AUTO_EXECUTE':
        return {
          label: 'AUTO_EXECUTE · Traitement Direct Sans Fardeau',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: CheckCircle2,
        };
      case 'TRIGGER_BPMN':
        return {
          label: 'TRIGGER_BPMN · Escalade Flowable BPMN & Conformité',
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: Activity,
        };
      case 'REQUEST_INFO':
        return {
          label: 'REQUEST_INFO · Précisions Bancaires Requises',
          color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
          icon: AlertCircle,
        };
      case 'BLOCK':
        return {
          label: 'BLOCK · Transaction Interrompue (Anti-Fraude)',
          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          icon: AlertCircle,
        };
      default:
        return {
          label: 'EN VEILLE ACTIVE · Prêt pour Requête',
          color: 'bg-slate-500/10 text-slate-600 dark:text-zinc-400 border-slate-500/20',
          icon: Clock,
        };
    }
  };

  const activeDecision = agent?.decision ?? agent?.defaultPolicy ?? 'IDLE';
  const badgeInfo = getDecisionBadge(activeDecision);
  const BadgeIcon = badgeInfo.icon;
  const aiContext = aiAskMutation.data;

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className='flex flex-col h-[calc(100vh-125px)] gap-3.5 max-w-6xl mx-auto w-full'>
      {/* ── TOP HUD COMMAND BAR: Living AI Agent Banner ── */}
      <div className='rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-4 sm:p-5 shadow-lg shadow-black/5'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          {/* Agent Identity & Status */}
          <div className='flex items-center gap-3.5'>
            <div className='relative'>
              <div className='w-12 h-12 rounded-2xl ai-halo-orbit flex items-center justify-center bg-gradient-to-tr from-orange-500 to-amber-500 shadow-md'>
                <Bot className='w-6 h-6 text-white' />
              </div>
              <span className='absolute -bottom-1 -right-1 flex h-4 w-4'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-zinc-900' />
              </span>
            </div>

            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 tracking-tight'>
                  FinBank Agent IA Hybride
                </h1>
                <span className='hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'>
                  Autonome & Certifié
                </span>
              </div>
              <p className='text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5'>
                <span>Session <code className='font-mono font-bold text-orange-600 dark:text-orange-400'>#{sessionId.slice(0, 8)}</code></span>
                <span>•</span>
                <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>
                  Statut: {sessionQuery.data?.status ?? 'ACTIF'}
                </span>
              </p>
            </div>
          </div>

          {/* Real-time Architecture Micro-Pills */}
          <div className='flex items-center flex-wrap gap-2'>
            <div className='hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'>
              <Cpu className='w-3 h-3 text-orange-500' />
              <span>Qwen2.5:7b On-Premise</span>
            </div>

            <div className='hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'>
              <Shield className='w-3 h-3 text-emerald-500' />
              <span>Sensitive Line 5 000 €</span>
            </div>

            <button
              type='button'
              onClick={() => setAiPanelOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                aiPanelOpen
                  ? 'bg-sky-500 text-white border-sky-600 shadow-md'
                  : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100'
              }`}
            >
              <Sparkles className='w-3.5 h-3.5' />
              <span>RAG Vectoriel</span>
              {aiPanelOpen ? <ChevronUp className='w-3 h-3' /> : <ChevronDown className='w-3 h-3' />}
            </button>

            <button
              type='button'
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['conversation', sessionId] })}
              className='p-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors'
              title='Actualiser la conversation'
            >
              <RefreshCw className='w-3.5 h-3.5' />
            </button>
          </div>
        </div>

        {/* Dynamic Decision Status Ribbon */}
        <div className='mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs'>
          <div className='flex items-center gap-2'>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${badgeInfo.color}`}>
              <BadgeIcon className='w-3.5 h-3.5' />
              {badgeInfo.label}
            </span>
            {latestActivity && (
              <span className='text-slate-500 dark:text-zinc-400 text-[11px] hidden sm:inline'>
                Dernière action : <strong className='text-slate-700 dark:text-zinc-300 font-mono'>{latestActivity.action ?? latestActivity.intent ?? 'Analyse'}</strong>
              </span>
            )}
          </div>

          <div className='flex items-center gap-1'>
            <div className='ai-wave-bar' />
            <div className='ai-wave-bar' />
            <div className='ai-wave-bar' />
            <div className='ai-wave-bar' />
            <div className='ai-wave-bar' />
            <span className='ml-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400'>
              DSP2 & ISO 20022 Sécurisé
            </span>
          </div>
        </div>
      </div>

      {/* ── PENDING BANKING CONFIRMATION MODAL / CALLOUT ── */}
      {pendingConfirmationLabel && (
        <div className='rounded-2xl border-2 border-orange-500/40 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 p-4 backdrop-blur-md shadow-lg'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
            <div className='flex items-start gap-3'>
              <div className='p-2 rounded-xl bg-orange-500 text-white shrink-0 shadow-md'>
                <Shield className='w-5 h-5' />
              </div>
              <div>
                <h4 className='text-sm font-bold text-orange-950 dark:text-orange-200'>
                  {pendingConfirmationLabel}
                </h4>
                {pendingConfirmationDetails && (
                  <p className='text-xs font-mono font-medium text-orange-800 dark:text-orange-300 mt-0.5'>
                    {pendingConfirmationDetails}
                  </p>
                )}
                <p className='text-[11px] text-slate-600 dark:text-zinc-400 mt-1'>
                  Cette opération nécessite votre validation formelle avant signature numérique et compensation SEPA.
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2 self-end sm:self-center'>
              <button
                type='button'
                onClick={() => sendMutation.mutate('annuler')}
                disabled={sendMutation.isPending}
                className='px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 transition-colors'
              >
                Annuler
              </button>
              <button
                type='button'
                onClick={() => sendMutation.mutate('confirmer')}
                disabled={sendMutation.isPending}
                className='px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5'
              >
                <Check className='w-3.5 h-3.5' />
                <span>Confirmer l'opération</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPANDABLE RAG KNOWLEDGE INSPECTOR ── */}
      {aiPanelOpen && (
        <div className='rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/90 dark:bg-sky-950/40 p-4 backdrop-blur-md transition-all'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-2'>
              <Sparkles className='w-4 h-4 text-sky-600 dark:text-sky-400' />
              <h3 className='text-xs font-bold text-sky-950 dark:text-sky-200 uppercase tracking-wider'>
                Inspecteur RAG Vectoriel (PostgreSQL pgvector)
              </h3>
            </div>
            <span className='text-[10px] font-mono text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-lg'>
              Embedding 768-dim · Cosine Similarity
            </span>
          </div>

          {aiContext ? (
            <div className='space-y-2 mt-2'>
              <p className='text-xs text-slate-700 dark:text-zinc-300'>
                <strong>Requête analysée :</strong> <span className='font-mono'>"{aiContext.question}"</span>
              </p>
              {aiContext.matches?.length > 0 ? (
                <div className='grid gap-1.5 max-h-36 overflow-y-auto pr-1'>
                  {aiContext.matches.map((chunk: string, i: number) => (
                    <div key={i} className='p-2 rounded-xl bg-white dark:bg-zinc-900 border border-sky-100 dark:border-sky-900/80 text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed font-mono'>
                      <span className='font-bold text-sky-600 dark:text-sky-400 mr-1.5'>[Chunk #{i + 1}]</span>
                      {chunk}
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-xs text-slate-500 dark:text-zinc-400 italic'>
                  Aucun chunk spécifique extrait pour cette formulation. Réponse basée sur la politique générale.
                </p>
              )}
            </div>
          ) : (
            <p className='text-xs text-sky-700 dark:text-sky-300'>
              Posez une question bancaire pour observer en direct les fragments réglementaires et tarifaires extraits par le RAG.
            </p>
          )}
        </div>
      )}

      {/* ── CONVERSATION STREAM (Scrollable Message Hub) ── */}
      <div className='flex-1 overflow-y-auto rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-6 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30 dark:from-zinc-900/50 dark:via-zinc-900 dark:to-zinc-950 shadow-inner space-y-4'>
        {messages.length === 0 && (
          <div className='h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto'>
            <div className='w-16 h-16 rounded-3xl ai-halo-orbit flex items-center justify-center bg-gradient-to-tr from-orange-500 to-amber-500 shadow-xl mb-4'>
              <Bot className='w-8 h-8 text-white' />
            </div>
            <h3 className='text-base font-extrabold text-slate-900 dark:text-zinc-100'>
              Bonjour ! Je suis votre Assistant Bancaire Intelligent.
            </h3>
            <p className='text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed max-w-sm'>
              Je peux orchestrer vos virements instantanés SEPA, analyser vos soldes, vérifier la conformité de vos opérations ou répondre à vos questions réglementaires.
            </p>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full text-left'>
              {SUGGESTED_PROMPTS.slice(0, 4).map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type='button'
                    onClick={() => {
                      setInput(item.prompt);
                      sendMutation.mutate(item.prompt);
                    }}
                    className='p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 hover:border-orange-500/50 hover:shadow-md transition-all group'
                  >
                    <div className='flex items-center gap-2 mb-1'>
                      <Icon className='w-3.5 h-3.5 text-orange-500' />
                      <span className='text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400'>
                        {item.label}
                      </span>
                    </div>
                    <p className='text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1'>
                      {item.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.senderType === 'USER';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[90%] sm:max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  isUser
                    ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white'
                    : 'ai-halo-orbit bg-slate-900 dark:bg-zinc-800 text-white border border-slate-700'
                }`}
              >
                {isUser ? <User className='w-4 h-4' /> : <Bot className='w-4 h-4 text-orange-400' />}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`group relative rounded-3xl p-4 text-xs sm:text-sm leading-relaxed transition-all shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-tr-sm'
                    : 'bg-white dark:bg-zinc-850 text-slate-800 dark:text-zinc-100 border border-slate-200/90 dark:border-zinc-750 rounded-tl-sm shadow-md'
                }`}
              >
                {/* Agent Header Metadata */}
                {!isUser && (
                  <div className='flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 dark:text-zinc-400 font-semibold'>
                    <span className='flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold'>
                      <Sparkles className='w-3 h-3' />
                      Agent IA FinBank
                    </span>
                    <span className='font-mono'>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {/* Message Content */}
                <div className='whitespace-pre-line break-words'>
                  {m.content}
                </div>

                {/* Contextual Action Shortcuts */}
                {!isUser && (
                  <div className='mt-3 pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap gap-2'>
                    {/(?:ticket de support|support ticket|#\d+)/i.test(m.content) && (
                      <button
                        type='button'
                        onClick={() => navigate('/help')}
                        className='px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 text-[11px] font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1 transition-colors'
                      >
                        <HelpCircle className='w-3 h-3' />
                        <span>Suivre mon ticket</span>
                      </button>
                    )}

                    {/(?:virement|dépôt|transfert|reçu|reçu d'exécution)/i.test(m.content) && (
                      <button
                        type='button'
                        onClick={() => navigate('/history')}
                        className='px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 transition-colors'
                      >
                        <FileText className='w-3 h-3' />
                        <span>Voir l'Avis d'Opération</span>
                      </button>
                    )}

                    {/(?:carte|plafond|bloquer)/i.test(m.content) && (
                      <button
                        type='button'
                        onClick={() => navigate('/cards')}
                        className='px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1 transition-colors'
                      >
                        <CreditCard className='w-3 h-3' />
                        <span>Gérer ma Carte</span>
                      </button>
                    )}

                    <button
                      type='button'
                      onClick={() => copyToClipboard(m.content, m.id)}
                      className='ml-auto px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors'
                      title='Copier la réponse'
                    >
                      {copiedId === m.id ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                )}

                {isUser && (
                  <span className='block text-[10px] mt-1.5 text-white/75 text-right font-mono'>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* ── AUTONOMOUS AGENT THINKING HUD (when processing) ── */}
        {sendMutation.isPending && (
          <div className='flex gap-3 max-w-md mr-auto animate-fade-in'>
            <div className='w-8 h-8 rounded-2xl ai-halo-orbit flex items-center justify-center bg-slate-900 text-white shrink-0 shadow-md'>
              <Bot className='w-4 h-4 text-orange-400' />
            </div>

            <div className='rounded-2xl px-4 py-3 bg-white dark:bg-zinc-850 border border-orange-500/30 shadow-md text-xs space-y-2'>
              <div className='flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold'>
                <Sparkles className='w-3.5 h-3.5 animate-spin' />
                <span className='tracking-tight'>
                  {thinkingSeconds >= 12
                    ? "L'agent est toujours en train de réfléchir..."
                    : "L'agent est en train de réfléchir..."}
                </span>
                <span className='ml-auto font-mono text-[10px] text-slate-400 dark:text-zinc-500'>
                  {thinkingSeconds}s
                </span>
              </div>

              <div className='flex items-center gap-1 py-0.5'>
                <div className='ai-wave-bar' />
                <div className='ai-wave-bar' />
                <div className='ai-wave-bar' />
                <div className='ai-wave-bar' />
                <div className='ai-wave-bar' />
              </div>
            </div>
          </div>
        )}

        {sendMutation.isError && (
          <div role='alert' className='max-w-xl mr-auto rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
            {axios.isAxiosError(sendMutation.error) && sendMutation.error.response?.status === 503
              ? 'Service momentanément indisponible : votre assistant bancaire ne répond pas pour le moment. Veuillez réessayer dans quelques instants.'
              : 'Impossible d’obtenir une réponse du serveur. Vérifiez votre conversation avant de renvoyer le message pour éviter un doublon.'}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── QUICK ACTION CHIPS ROW ── */}
      <div className='flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar'>
        <span className='text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1'>
          Prompts Rapides :
        </span>
        {SUGGESTED_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            type='button'
            onClick={() => {
              setInput(item.prompt);
            }}
            className='shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 text-slate-700 dark:text-zinc-300 transition-all shadow-sm'
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── INPUT HUD BAR ── */}
      <div className='relative flex items-center gap-2'>
        <div className='relative flex-1'>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim() && !sendMutation.isPending) {
                sendMutation.mutate(input.trim());
              }
            }}
            placeholder="Posez votre question ou ordonnez une opération (ex: 'Fais un virement de 200 €')..."
            className='w-full px-5 py-3.5 pr-12 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 text-xs sm:text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-md transition-all'
          />
          {input.trim() && (
            <button
              type='button'
              onClick={() => setInput('')}
              className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold'
            >
              Effacer
            </button>
          )}
        </div>

        <button
          type='button'
          disabled={!input.trim() || sendMutation.isPending}
          onClick={() => {
            if (input.trim()) sendMutation.mutate(input.trim());
          }}
          className='rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white px-5 sm:px-6 py-3.5 font-bold text-xs sm:text-sm disabled:opacity-50 transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2 shrink-0'
        >
          <span>{sendMutation.isPending ? 'Analyse...' : 'Envoyer'}</span>
          <Send className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
}
