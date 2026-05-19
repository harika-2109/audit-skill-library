'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const BACKEND = 'https://audit-skill-library.onrender.com';

interface Skill {
  name: string;
  description: string;
  category: string;
  status: string;
  version: string;
  sla_minutes: number | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  planning: 'Planning',
  documentation: 'Documentation',
  sox: 'SOX',
  testing: 'Testing',
  reporting: 'Reporting',
  regulatory: 'Regulatory',
  monitoring: 'Monitoring',
};

const CATEGORY_ORDER = ['planning', 'documentation', 'sox', 'testing', 'reporting', 'regulatory', 'monitoring'];

export default function CatalogPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/skills`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setSkills(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const grouped: Record<string, Skill[]> = {};
  for (const s of skills) {
    (grouped[s.category] ??= []).push(s);
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Internal Audit Skill Library</h1>
          <p className="text-sm text-slate1">
            {loading ? 'Loading…' : `${skills.length} skills · Browse, run, or contribute.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/chat" className="px-4 py-2 text-sm rounded border border-line bg-white hover:bg-paper">
            Open chat
          </Link>
          <Link href="/skills/wizard" className="px-4 py-2 text-sm rounded bg-brand text-white hover:bg-brand-dark font-medium">
            + Create new skill
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-slate1">
          <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading skills… first load may take ~30s while the backend wakes up.</p>
        </div>
      )}

      {error && (
        <div className="text-center py-16">
          <p className="text-sm text-red-700 mb-2">Couldn't load skills: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm rounded bg-brand text-white hover:bg-brand-dark"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-8 mt-6">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
            <section key={cat}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate1 mb-3 pb-1 border-b border-line">
                {CATEGORY_LABEL[cat] || cat}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[cat].map((s) => (
                  <Link
                    key={s.name}
                    href={`/skills/${s.name}`}
                    className="block border border-line rounded-md p-4 hover:border-brand hover:shadow-sm transition bg-white"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <code className="text-sm font-mono text-brand">/{s.name}</code>
                      <span className="text-xs px-2 py-0.5 rounded border bg-green-50 text-green-800 border-green-200">
                        {s.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate1 leading-snug mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate1">
                      <span>v{s.version}</span>
                      {s.sla_minutes != null && (
                        <>
                          <span>·</span>
                          <span>~{s.sla_minutes} min</span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}