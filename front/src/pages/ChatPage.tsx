import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../api/messages';
import { sessionsApi } from '../api/sessions';
import type { MessageResponse } from '../api/messages';

export default function ChatPage() {
  const { id } = useParams();
  const sessionId = id ?? '';
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const sessionQuery = useQuery({ queryKey: ['session', sessionId], queryFn: () => sessionsApi.getById(sessionId), enabled: !!sessionId });

  const conversationQuery = useQuery({ queryKey: ['conversation', sessionId], queryFn: () => messagesApi.getConversation(sessionId), enabled: !!sessionId });

  const sendMutation = useMutation({ mutationFn: (content: string) => messagesApi.create(sessionId, { content }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['conversation', sessionId] }); setInput(''); } });

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

  return (
    <div className='p-6 flex flex-col h-full'>
      <div className='mb-4'>
        <h2 className='text-xl font-bold'>Chat</h2>
        <p className='text-sm text-gray-500'>Session: {sessionQuery.data?.id ?? sessionId}</p>
      </div>

      <div className='flex-1 overflow-auto border rounded-lg p-4 bg-white'>
        {messages.length === 0 && <p className='text-sm text-gray-400'>No messages yet.</p>}
        <div className='space-y-3'>
          {messages.map((m: any) => (
            <div key={m.id} className={`p-3 rounded-lg ${m.senderType === 'USER' ? 'bg-cream-50 self-start' : 'bg-primary-50 self-end'}`}>
              <div className='text-sm text-gray-700'>{m.content}</div>
              <div className='text-xs text-gray-400 mt-1'>{m.createdAt}</div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className='mt-4'>
        <div className='flex gap-2'>
          <input value={input} onChange={(e) => setInput(e.target.value)} className='flex-1 px-3 py-2 rounded-xl border' placeholder='Write your message...' />
          <button disabled={!input.trim() || sendMutation.isLoading} onClick={() => sendMutation.mutate(input.trim())} className='rounded-xl bg-primary-500 text-white px-4 py-2 disabled:opacity-50'>
            {sendMutation.isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
