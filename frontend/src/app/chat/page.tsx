'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamChat, listSkills } from '@/lib/api';
import type { SkillSummary } from '@/lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function ChatInner() {
  const searchParams = useSearchParams();
  const skillContext = searchParams.get('skill') || undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listSkills({ status: 'published' }).then(setSkills).catch(() => setSkills([]));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);
    setError(null);

    try {
      let acc = '';
      for await (const delta of streamChat(nextMessages, skillContext)) {
        acc += delta;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat failed');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const suggestPrompts = skillContext
    ? [`Run /${skillContext}`, `What inputs does this skill need?`, `Show me an example output`]
    : [
        'Test SOX control FR-REV-04 for Q1',
        'Score risk for the wire transfer process',
        'Draft an issue: reviewer approved 3 of 25 sample items without evidence',
      ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="flex flex-col h-[calc(100vh-220px)]">
        <div className="border border-line rounded-md flex-1 flex flex-col bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-paper flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold text-ink">Audit chat</span>
              {skillContext && (
                <span className="ml-2 text-xs bg-white border border-line px-2 py-0.5 rounded font-mono">
                  /{skillContext}
                </span>
              )}
            </div>
            {skillContext && (
              <Link href="/chat" className="text-xs text-slate1 hover:text-brand">Exit skill context</Link>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate1 text-sm mb-4">
                  {skillContext ? `Loaded ${skillContext}. Ask anything or run it.` : 'Ask anything about audit, or invoke a skill with /skill-name.'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => setInput(p)}
                      className="text-xs px-3 py-1.5 rounded-full border border-line bg-paper hover:border-brand text-slate1"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`mb-5 ${m.role === 'user' ? 'flex justify-end' : ''}`}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[80%] bg-paper border border-line rounded-md px-4 py-2.5 text-sm'
                      : 'max-w-full prose-skill text-sm'
                  }
                >
                  {m.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || '…'}</ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && (
            <div className="mx-4 mb-3 border border-red-200 bg-red-50 text-red-800 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="border-t border-line p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={skillContext ? `Ask within /${skillContext}…` : 'Ask the audit assistant…  (Shift+Enter for newline)'}
                rows={2}
                disabled={streaming}
                className="flex-1 px-3 py-2 border border-line rounded text-sm resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-paper"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                className="px-4 py-2 text-sm bg-brand text-white rounded hover:bg-brand-dark font-medium disabled:opacity-50 self-end"
              >
                {streaming ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="border border-line rounded-md p-4 bg-white h-fit">
        <h3 className="text-sm font-semibold text-ink mb-3">Published skills</h3>
        <div className="space-y-1">
          {skills.map((s) => (
            <Link
              key={s.name}
              href={`/chat?skill=${s.name}`}
              className={`block text-xs font-mono px-2 py-1.5 rounded hover:bg-paper ${
                skillContext === s.name ? 'bg-paper border-l-2 border-brand text-brand' : 'text-slate1'
              }`}
            >
              /{s.name}
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate1">Loading chat…</div>}>
      <ChatInner />
    </Suspense>
  );
}
