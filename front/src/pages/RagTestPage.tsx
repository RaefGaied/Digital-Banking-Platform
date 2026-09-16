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
      <section className='overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-5'>
          <div className='max-w-2xl'>
            <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200'>
              <Database className='h-4 w-4' /> RAG playground
            </div>
            <h1 className='text-3xl font-black tracking-tight md:text-4xl'>Test your banking knowledge base</h1>
            <p className='mt-3 max-w-xl text-sm leading-6 text-slate-300'>
              Ask a question and inspect the documents retrieved from the active knowledge base by the assistant.
            </p>
          </div>
          <div className='rounded-2xl border border-white/10 bg-white/5 p-4 text-right'>
            <Sparkles className='ml-auto h-6 w-6 text-cyan-300' />
            <p className='mt-2 text-xs text-slate-400'>Endpoint</p>
            <p className='font-mono text-sm text-cyan-200'>POST /ai/ask</p>
          </div>
        </div>
      </section>

      <section className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]'>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6'>
          <div className='mb-4 flex items-center gap-2'>
            <Search className='h-5 w-5 text-orange-600' />
            <h2 className='text-lg font-bold text-slate-900'>Ask the retriever</h2>
          </div>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) ask();
            }}
            rows={5}
            placeholder='Example: What are the conditions for a transfer?'
            className='w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100'
          />
          <div className='mt-4 flex flex-wrap gap-2'>
            {examples.map((example) => (
              <button
                key={example}
                type='button'
                onClick={() => setQuestion(example)}
                className='rounded-full border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700'
              >
                {example}
              </button>
            ))}
          </div>
          <button
            type='button'
            onClick={ask}
            disabled={!question.trim() || askMutation.isPending}
            className='mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <Search className='h-4 w-4' />
            {askMutation.isPending ? 'Searching...' : 'Search knowledge base'}
          </button>
          {askMutation.isError && (
            <div className='mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700'>
              <AlertCircle className='h-4 w-4 shrink-0' /> The RAG request could not be completed.
            </div>
          )}
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <h2 className='text-lg font-bold text-slate-900'>Retrieval summary</h2>
            {result && (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${result.hasResults ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {result.hasResults ? 'Match found' : 'No match'}
              </span>
            )}
          </div>
          {!result ? (
            <div className='flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500'>
              Your retrieved chunks and confidence will appear here.
            </div>
          ) : (
            <div className='space-y-4 text-sm'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='rounded-xl bg-slate-50 p-3'><p className='text-xs text-slate-500'>Intent</p><p className='mt-1 font-bold text-slate-900'>{result.intent || 'Not detected'}</p></div>
                <div className='rounded-xl bg-slate-50 p-3'><p className='text-xs text-slate-500'>Confidence</p><p className='mt-1 font-bold text-slate-900'>{result.confidence == null ? 'N/A' : `${Math.round(result.confidence * 100)}%`}</p></div>
              </div>
              <div>
                <p className='mb-2 text-xs font-bold uppercase tracking-wider text-slate-500'>Retrieved matches ({result.matches.length})</p>
                {result.matches.length ? <div className='space-y-2'>{result.matches.map((match, index) => <div key={`${match}-${index}`} className='rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-slate-700'>{match}</div>)}</div> : <p className='text-slate-500'>No matching document was returned.</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      {result && (
        <section className='rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-100 shadow-sm md:p-6'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div><h2 className='text-lg font-bold'>Retrieved context</h2><p className='text-xs text-slate-400'>The context assembled by the backend for this question.</p></div>
            <span className='font-mono text-xs text-slate-400'>{result.context.length} chars</span>
          </div>
          <pre className='max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-xs leading-6 text-slate-300'>{result.context || 'No context returned.'}</pre>
        </section>
      )}
    </div>
  );
}