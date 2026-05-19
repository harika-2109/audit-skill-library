'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSkill } from '@/lib/api';
import { CATEGORY_LABEL, type Skill } from '@/lib/types';
import { DeleteSkillButton } from '@/components/DeleteSkillButton';

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSkill(name)
      .then(setSkill)
      .catch((e) => setError(e.message));
  }, [name]);

  if (error) {
    return (
      <div>
        <Link href="/" className="text-sm text-slate1 hover:text-brand inline-block mb-4">
          ← Back to catalog
        </Link>
        <p className="text-red-700 text-sm">Could not load skill: {error}</p>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/" className="text-sm text-slate1 hover:text-brand inline-flex items-center gap-1 mb-4">
        ← Back to catalog
      </Link>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs px-2 py-0.5 rounded bg-paper border border-line text-slate1">
              {CATEGORY_LABEL[skill.category]}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-ink">{skill.name}</h1>
          <p className="text-sm text-slate1 mt-1">
            v{skill.version}
            {skill.sla_minutes != null && ` · ~${skill.sla_minutes} min`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/chat?skill=${skill.name}`}
            className="px-4 py-2 text-sm rounded bg-brand text-white hover:bg-brand-dark font-medium"
          >
            Run skill in chat →
          </Link>
          <DeleteSkillButton name={skill.name} />
        </div>
      </div>

      <p className="text-base text-ink leading-relaxed mb-6">{skill.description}</p>

      <div className="border border-line rounded-md overflow-hidden">
        <div className="bg-paper border-b border-line px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate1">
          SKILL.md
        </div>
        <div className="px-6 py-5 prose-skill bg-white">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{skill.body}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}