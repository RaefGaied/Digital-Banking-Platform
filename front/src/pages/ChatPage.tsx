import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../api/messages';
import { sessionsApi } from '../api/sessions';
import { agentsApi } from '../api/agents';
import { aiApi } from '../api/ai';
import type { MessageResponse } from '../api/messages';
import { Activity, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function ChatPage() {
  const { id } = useParams();
  const sessionId = id ?? '';
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const sessionQuery = useQuery({ queryKey: ['session', sessionId], queryFn: () => sessionsApi.getById(sessionId), enabled: !!sessionId });
  
  const conversationQuery = useQuery({ queryKey: ['conversation', sessionId], queryFn: () => messagesApi.getConversation(sessionId), enabled: !!sessionId });

  const agentQuery = useQuery({ 
    queryKey: ['agent-session', sessionId], 
    queryFn: () => agentsApi.getBySession(sessionId), 
    enabled: !!sessionId,
    retry: false
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
      <div className='p-6'>
        <h2 className='text-lg font-semibold'>No session selected</h2>
        <p className='text-sm text-gray-500 mt-2'>Open a session first from the Sessions page.</p>
        <button onClick={() => navigate('/sessions')} className='mt-4 rounded bg-primary-500 text-white px-4 py-2'>Go to Sessions</button>
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

  const pendingAction = agent && typeof agent.context === 'object' && agent.context !== null && 'pendingToolAction' in agent.context
    ? String((agent.context as Record<string, unknown>).pendingToolAction)
    : null;

  const pendingArguments = agent && typeof agent.context === 'object' && agent.context !== null && 'pendingToolArguments' in agent.context
    ? (agent.context as Record<string, unknown>).pendingToolArguments as Record<string, unknown> | null
    : null;

  const pendingConfirmationLabel = pendingAction === 'confirm_transfer'
    ? 'Virement en attente de confirmation'
    : pendingAction
      ? `Action en attente : ${pendingAction}`
      : null;

  const pendingConfirmationDetails = pendingAction === 'confirm_transfer' && pendingArguments
    ? `Montant : ${pendingArguments.amount ?? 'N/A'}, Compte : ${pendingArguments.targetAccountNumber ?? 'N/A'}`
    : pendingArguments
      ? JSON.stringify(pendingArguments)
      : null;

  // Determine agent status based on decision
  const getDecisionColor = (decision?: string) => {
    switch(decision) {
      case 'AUTO_EXECUTE': return 'bg-green-50 border-green-200 text-green-700';
      case 'TRIGGER_BPMN': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'REQUEST_INFO': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'BLOCK': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };
  
  const getDecisionIcon = (decision?: string) => {
    switch(decision) {
      case 'AUTO_EXECUTE': return <CheckCircle2 className='w-4 h-4' />;
      case 'TRIGGER_BPMN': return <Activity className='w-4 h-4' />;
      case 'REQUEST_INFO': return <AlertCircle className='w-4 h-4' />;
      case 'BLOCK': return <AlertCircle className='w-4 h-4' />;
      default: return <Clock className='w-4 h-4' />;
    }
  };

  const activeDecision = agent?.decision ?? agent?.defaultPolicy ?? 'IDLE';
  const aiContext = aiAskMutation.data;

  return (
    <div className='p-6 flex flex-col h-full gap-4'>
      <div>
        <h2 className='text-xl font-bold'>Chat</h2>
        <p className='text-sm text-gray-500'>Session: {sessionQuery.data?.id ?? sessionId}</p>
      </div>

      {/* Agent Activity Panel */}
      {agent && (
        <div className={`border rounded-lg p-4 ${getDecisionColor(activeDecision)}`}>
          <div className='flex flex-wrap items-center gap-2 mb-2'>
            {getDecisionIcon(activeDecision)}
            <span className='font-semibold'>Agent Activity</span>
            {pendingAction && (
              <span className='rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800'>
                EN ATTENTE
              </span>
            )}
          </div>
          <div className='text-sm space-y-1'>
            <p><strong>Status:</strong> {activeDecision}</p>
            {latestActivity && (
              <>
                <p><strong>Last action:</strong> {latestActivity.action ?? latestActivity.intent ?? 'Processing'}</p>
                {latestActivity.note && <p><strong>Note:</strong> {latestActivity.note}</p>}
              </>
            )}
            {agent.lastTransactionId && (
              <p><strong>Last transaction:</strong> {agent.lastTransactionId.slice(0, 8)}...</p>
            )}
            <p className='text-xs mt-2'>Updated: {agent.updatedAt || new Date().toLocaleTimeString()}</p>
          </div>

          {pendingConfirmationLabel && (
            <div className='mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800'>
              <div className='font-semibold'>Action en attente</div>
              <div className='text-sm mt-1'>{pendingConfirmationLabel}</div>
              {pendingConfirmationDetails && (
                <div className='text-xs mt-2 text-orange-700'>
                  {pendingConfirmationDetails}
                </div>
              )}
              <div className='text-xs mt-2 text-orange-700'>Répondez par <strong>oui</strong> ou <strong>non</strong>.</div>
            </div>
          )}

          {activity.length > 0 && (
            <div className='mt-4 rounded-lg border border-gray-200 bg-white p-3'>
              <div className='text-sm font-semibold text-gray-700 mb-2'>Recent action trace</div>
              <div className='space-y-2'>
                {activity.map((entry, index) => (
                  <div key={`${entry.timestamp}-${index}`} className='rounded-lg border border-gray-100 bg-gray-50 p-3'>
                    <div className='flex justify-between text-xs text-gray-500'>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      <span>{entry.decision ?? 'N/A'}</span>
                    </div>
                    <div className='mt-1 text-sm text-gray-700'>{entry.action ?? entry.intent ?? 'Agent step'}</div>
                    {entry.note && <div className='mt-1 text-xs text-gray-500'>{entry.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className='rounded-lg border border-sky-200 bg-sky-50 p-3'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h3 className='text-sm font-semibold text-sky-800'>AI Help</h3>
            <p className='text-xs text-sky-700'>Relevant banking guidance for the current request.</p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setAiPanelOpen((value) => !value)}
              className='rounded border border-sky-200 bg-white px-2 py-1 text-xs font-medium text-sky-700'
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
              className='rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'
            >
              {aiAskMutation.isPending ? 'Loading...' : 'Ask AI'}
            </button>
          </div>
        </div>

        {aiPanelOpen && (
          <div className='mt-3 rounded border border-sky-200 bg-white p-3'>
            {aiAskMutation.isPending ? (
              <p className='text-sm text-sky-700'>Searching the banking knowledge base…</p>
            ) : aiContext ? (
              <>
                <div className='mb-2 flex items-center justify-between gap-2'>
                  <span className='text-[10px] font-semibold uppercase tracking-wide text-sky-700'>Context</span>
                  {aiContext.intent && (
                    <span className='rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700'>
                      {String(aiContext.intent)}
                    </span>
                  )}
                </div>

                {aiContext.error ? (
                  <p className='text-sm text-sky-700'>{aiContext.error}</p>
                ) : (
                  <>
                    <p className='mb-2 text-xs text-sky-700'>Question: {aiContext.question}</p>
                    {aiContext.matches.length > 0 ? (
                      <ul className='space-y-2 text-sm text-sky-900'>
                        {aiContext.matches.map((match, index) => (
                          <li key={`${match}-${index}`} className='rounded border border-sky-200 bg-sky-50 p-2'>
                            {match}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='text-sm text-sky-700'>No matching banking knowledge found.</p>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className='text-sm text-sky-700'>Type a question in the box to get AI guidance.</p>
            )}
          </div>
        )}
      </div>

      <div className='flex-1 overflow-auto border rounded-lg p-4 bg-white'>
        {messages.length === 0 && <p className='text-sm text-gray-400'>No messages yet.</p>}
        <div className='space-y-3'>
          {messages.map((m: any) => (
            <div key={m.id} className={`p-3 rounded-lg ${m.senderType === 'USER' ? 'bg-cream-50 ml-auto max-w-xs' : 'bg-primary-50 mr-auto max-w-xs'}`}>
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-xs font-semibold text-gray-600'>{m.senderType}</span>
                {m.intent && <span className='text-xs bg-gray-200 px-2 py-0.5 rounded'>{m.intent}</span>}
              </div>
              <div className='text-sm text-gray-700'>{m.content}</div>
              <div className='text-xs text-gray-400 mt-1'>{new Date(m.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <div>
        <div className='flex gap-2'>
          <input value={input} onChange={(e) => setInput(e.target.value)} className='flex-1 px-3 py-2 rounded-xl border' placeholder='Write your message...' />
          <button disabled={!input.trim() || sendMutation.isPending} onClick={() => sendMutation.mutate(input.trim())} className='rounded-xl bg-primary-500 text-white px-4 py-2 disabled:opacity-50'>
            {sendMutation.isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
