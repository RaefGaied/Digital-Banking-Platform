import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../api/messages';
import { sessionsApi } from '../api/sessions';
import { agentsApi } from '../api/agents';
import { aiApi } from '../api/ai';
import type { MessageResponse } from '../api/messages';
import { Activity, CheckCircle2, AlertCircle, Clock, Send, Bot, User, Sparkles } from 'lucide-react';

export default function ChatPage() {
  const { id } = useParams();
  const sessionId = id ?? '';
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const sessionQuery = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi.getById(sessionId),
    enabled: !!sessionId,
  });

  const conversationQuery = useQuery({
    queryKey: ['conversation', sessionId],
    queryFn: () => messagesApi.getConversation(sessionId),
    enabled: !!sessionId,
  });

  const agentQuery = useQuery({
    queryKey: ['agent-session', sessionId],
    queryFn: () => agentsApi.getBySession(sessionId),
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
      void aiAskMutation.mutateAsync(content);
      setInput('');
    },
  });

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [conversationQuery.data]);

  if (!sessionId) {
    return (
      <div className='card p-6 text-center max-w-md mx-auto my-12'>
        <Bot className='w-12 h-12 text-primary-500 mx-auto mb-3' />
        <h2 className='text-lg font-bold text-slate-900 dark:text-zinc-100'>No session selected</h2>
        <p className='text-sm text-slate-500 dark:text-zinc-400 mt-1 mb-5'>
          Open or select a banking session first from the Sessions management page.
        </p>
        <button
          onClick={() => navigate('/sessions')}
          className='w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold px-4 py-2.5 shadow-md'
        >
          Go to Sessions
        </button>
      </div>
    );
  }

  const messages: MessageResponse[] = conversationQuery.data ?? [];
  const agent = agentQuery.data;
  const activityQuery = useQuery({
    queryKey: ['agent-activity', sessionId],
    queryFn: () => agentsApi.getActivityBySession(sessionId),
    enabled: !!sessionId,
    retry: false,
  });

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
      ? 'Virement en attente de confirmation'
      : pendingAction
      ? `Action en attente : ${pendingAction}`
      : null;

  const pendingConfirmationDetails =
    pendingAction === 'confirm_transfer' && pendingArguments
      ? `Montant : ${pendingArguments.amount ?? 'N/A'}, Compte : ${pendingArguments.targetAccountNumber ?? 'N/A'}`
      : pendingArguments
      ? JSON.stringify(pendingArguments)
      : null;

  const getDecisionColor = (decision?: string) => {
    switch (decision) {
      case 'AUTO_EXECUTE':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300';
      case 'TRIGGER_BPMN':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300';
      case 'REQUEST_INFO':
        return 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300';
      case 'BLOCK':
        return 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300';
      default:
        return 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200';
    }
  };

  const getDecisionIcon = (decision?: string) => {
    switch (decision) {
      case 'AUTO_EXECUTE':
        return <CheckCircle2 className='w-4 h-4' />;
      case 'TRIGGER_BPMN':
        return <Activity className='w-4 h-4' />;
      case 'REQUEST_INFO':
        return <AlertCircle className='w-4 h-4' />;
      case 'BLOCK':
        return <AlertCircle className='w-4 h-4' />;
      default:
        return <Clock className='w-4 h-4' />;
    }
  };

  const activeDecision = agent?.decision ?? agent?.defaultPolicy ?? 'IDLE';
  const aiContext = aiAskMutation.data;

  return (
    <div className='flex flex-col h-[calc(100vh-140px)] gap-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight'>
            Banking Agent Chat
          </h2>
          <p className='text-xs sm:text-sm text-slate-500 dark:text-zinc-400'>
            Live Session: <span className='font-mono font-semibold'>{sessionQuery.data?.id ?? sessionId}</span>
          </p>
        </div>
      </div>

      {/* Agent Activity Panel */}
      {agent && (
        <div className={`border rounded-2xl p-4 transition-all ${getDecisionColor(activeDecision)}`}>
          <div className='flex flex-wrap items-center gap-2 mb-2'>
            {getDecisionIcon(activeDecision)}
            <span className='font-bold text-sm'>Agent Decision Engine</span>
            {pendingAction && (
              <span className='rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-300 px-2.5 py-0.5 text-xs font-extrabold'>
                ACTION PENDING
              </span>
            )}
          </div>
          <div className='text-xs space-y-1'>
            <p>
              <strong>Status:</strong> {activeDecision}
            </p>
            {latestActivity && (
              <p>
                <strong>Last action:</strong> {latestActivity.action ?? latestActivity.intent ?? 'Processing'}
              </p>
            )}
            {agent.lastTransactionId && (
              <p>
                <strong>Last transaction:</strong> {agent.lastTransactionId.slice(0, 10)}...
              </p>
            )}
          </div>

          {pendingConfirmationLabel && (
            <div className='mt-3 rounded-xl border border-orange-300 dark:border-orange-800 bg-orange-100/60 dark:bg-orange-950/60 p-3 text-orange-900 dark:text-orange-200'>
              <div className='font-bold text-xs'>{pendingConfirmationLabel}</div>
              {pendingConfirmationDetails && (
                <div className='text-[11px] mt-1 text-orange-800 dark:text-orange-300 font-mono'>
                  {pendingConfirmationDetails}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Help Banner */}
      <div className='rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/40 p-3.5'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <Sparkles className='w-4 h-4 text-sky-600 dark:text-sky-400' />
            <div>
              <h3 className='text-xs sm:text-sm font-bold text-sky-900 dark:text-sky-200'>AI Banking Assistant</h3>
              <p className='text-[11px] text-sky-700 dark:text-sky-300'>Contextual guidance for banking actions</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setAiPanelOpen((v) => !v)}
              className='rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-zinc-900 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 shadow-sm'
            >
              {aiPanelOpen ? 'Hide' : 'Show'}
            </button>
            <button
              type='button'
              disabled={!input.trim() || aiAskMutation.isPending}
              onClick={() => {
                const question = input.trim();
                if (!question) return;
                void aiAskMutation.mutateAsync(question);
              }}
              className='rounded-xl bg-sky-600 hover:bg-sky-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50 transition-colors'
            >
              {aiAskMutation.isPending ? 'Analyzing...' : 'Ask AI'}
            </button>
          </div>
        </div>

        {aiPanelOpen && aiContext && (
          <div className='mt-3 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-white dark:bg-zinc-900 p-3'>
            <p className='text-xs text-sky-900 dark:text-sky-200 font-medium mb-1'>Question: {aiContext.question}</p>
            {aiContext.matches?.length > 0 ? (
              <ul className='space-y-1.5 text-xs text-slate-700 dark:text-zinc-300'>
                {aiContext.matches.map((match: string, idx: number) => (
                  <li key={idx} className='p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900'>
                    {match}
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-xs text-sky-600 dark:text-sky-400'>No direct matches in knowledge base.</p>
            )}
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className='flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 shadow-inner'>
        {messages.length === 0 && (
          <div className='h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2'>
            <Bot className='w-8 h-8 opacity-40' />
            <p>No messages yet in this session. Say hello to start!</p>
          </div>
        )}
        <div className='space-y-3'>
          {messages.map((m: any) => {
            const isUser = m.senderType === 'USER';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 max-w-[85%] sm:max-w-md ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                    isUser ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-slate-700 dark:bg-zinc-700'
                  }`}
                >
                  {isUser ? <User className='w-3.5 h-3.5' /> : <Bot className='w-3.5 h-3.5' />}
                </div>
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  <p>{m.content}</p>
                  <span
                    className={`block text-[10px] mt-1.5 font-normal ${
                      isUser ? 'text-white/70 text-right' : 'text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <div className='flex gap-2'>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim() && !sendMutation.isPending) {
              sendMutation.mutate(input.trim());
            }
          }}
          className='flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 text-sm outline-none focus:border-primary-500 transition-colors shadow-sm'
          placeholder='Type your message or instruction...'
        />
        <button
          disabled={!input.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate(input.trim())}
          className='rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white px-5 py-3 font-bold text-sm disabled:opacity-50 transition-all shadow-md flex items-center gap-2'
        >
          <span>Send</span>
          <Send className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
}
