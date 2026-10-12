import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Database, Search, Sparkles } from 'lucide-react';
import { aiApi, type AiAskResponse } from '../api/ai';

const examples = [
  'How can I make a bank transfer?',
  'What should I do if my card is blocked?',
  'How long does a transfer take?',
];

export default function RagTestPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AiAskResponse | null>(null);

  const askMutation = useMutation({
    mutationFn: (value: string) => aiApi.ask(value),
    onSuccess: (response) => setResult(response),
  });

  const ask = () => {
    const value = question.trim();
    if (!value || askMutation.isPending) return;
    askMutation.mutate(value);
  };

  return (
    <div className='space-y-6'>
      <section className='relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/40 p-6 text-white shadow-xl dark:border-white/10 md:p-8'>
        <div className='absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none' />
        <div className='flex flex-wrap items-start justify-between gap-5'>
          <div className='max-w-2xl'>
            <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300'>
              <Database className='h-3.5 w-3.5' /> RAG Playground
            </div>
            <h1 className='text-3xl font-black tracking-tight text-white md:text-4xl'>Test your banking knowledge base</h1>
            <p className='mt-3 max-w-xl text-sm leading-6 text-slate-300'>
              Ask questions and inspect the documents retrieved from the active vector knowledge base by the assistant.
            </p>
          </div>
          <div className='rounded-2xl border border-white/10 bg-white/5 p-4 text-right backdrop-blur-md'>
            <Sparkles className='ml-auto h-6 w-6 text-orange-400' />
            <p className='mt-2 text-xs text-slate-400'>Endpoint</p>
            <p className='font-mono text-sm text-orange-300'>POST /ai/ask</p>
          </div>
        </div>
      </section>

      <section className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]'>
        <div className='glass-panel rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-[#121215]/90 md:p-6'>
          <div className='mb-4 flex items-center gap-2'>
            <Search className='h-5 w-5 text-orange-500' />
            <h2 className='text-lg font-bold text-slate-900 dark:text-white'>Ask the retriever</h2>
          </div>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) ask();
            }}
            rows={5}
            placeholder='Example: What are the conditions for an international transfer?'
            className='w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500'
          />
          <div className='mt-4 flex flex-wrap gap-2'>
            {examples.map((example) => (
              <button
                key={example}
                type='button'
                onClick={() => setQuestion(example)}
                className='rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-orange-400/40 dark:hover:text-orange-400'
              >
                {example}
              </button>
            ))}
          </div>
          <button
            type='button'
            onClick={ask}
            disabled={!question.trim() || askMutation.isPending}
            className='mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <Search className='h-4 w-4' />
            {askMutation.isPending ? 'Searching...' : 'Search knowledge base'}
          </button>
          {askMutation.isError && (
            <div className='mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'>
              <AlertCircle className='h-4 w-4 shrink-0' /> The RAG request could not be completed.
            </div>
          )}
        </div>

        <div className='glass-panel rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-[#121215]/90 md:p-6'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <h2 className='text-lg font-bold text-slate-900 dark:text-white'>Retrieval summary</h2>
            {result && (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${result.hasResults ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                {result.hasResults ? 'Match found' : 'No match'}
              </span>
            )}
          </div>
          {!result ? (
            <div className='flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10 dark:text-slate-500'>
              Your retrieved chunks and confidence score will appear here.
            </div>
          ) : (
            <div className='space-y-4 text-sm'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-white/5 dark:bg-white/5'>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>Intent</p>
                  <p className='mt-1 font-bold text-slate-900 dark:text-white'>{result.intent || 'Not detected'}</p>
                </div>
                <div className='rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-white/5 dark:bg-white/5'>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>Intent confidence</p>
                  <p className='mt-1 font-bold text-slate-900 dark:text-white'>{result.confidence == null ? 'N/A' : `${Math.round(result.confidence * 100)}%`}</p>
                </div>
              </div>
              <div>
                <p className='mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400'>Retrieved matches ({result.matches.length})</p>
                {result.matches.length ? (
                  <div className='space-y-2'>
                    {result.matches.map((match, index) => (
                      <div key={`${match}-${index}`} className='rounded-xl border border-orange-200/50 bg-orange-50/40 p-3 text-slate-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-slate-200'>
                        {match}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-slate-500 dark:text-slate-400'>No matching document was returned.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {result && (
        <section className='glass-panel rounded-2xl border border-slate-200/80 bg-slate-950 p-5 text-slate-100 shadow-sm dark:border-white/10 md:p-6'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-bold text-white'>Retrieved context</h2>
              <p className='text-xs text-slate-400'>The context assembled by the backend for this question.</p>
            </div>
            <span className='font-mono text-xs text-slate-400'>{result.context.length} chars</span>
          </div>
          <pre className='max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-6 text-slate-300'>{result.context || 'No context returned.'}</pre>
        </section>
      )}
    </div>
  );
}