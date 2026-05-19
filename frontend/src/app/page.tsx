import Link from 'next/link';
import { listSkills } from '@/lib/api';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type SkillCategory,
  type SkillSummary,
} from '@/lib/types';
import { SearchBar } from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

function groupByCategory(skills: SkillSummary[]): Record<string, SkillSummary[]> {
  const out: Record<string, SkillSummary[]> = {};
  for (const s of skills) {
    (out[s.category] ??= []).push(s);
  }
  return out;
}

function StatusBadge({ status }: { status: SkillSummary['status'] }) {
  const styles: Record<SkillSummary['status'], string> = {
    published: 'bg-green-50 text-green-800 border-green-200',
    in_review: 'bg-amber-50 text-amber-800 border-amber-200',
    draft: 'bg-gray-50 text-gray-700 border-gray-200',
    deprecated: 'bg-red-50 text-red-800 border-red-200',
  };
  const label = status.replace('_', ' ');
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${styles[status]}`}>
      {label}
    </span>
  );
}

function SkillCard({ s }: { s: SkillSummary }) {
  return (
    <Link
      href={`/skills/${s.name}`}
      className="block border border-line rounded-md p-4 hover:border-brand hover:shadow-sm transition bg-white"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <code className="text-sm font-mono text-brand">/{s.name}</code>
        <StatusBadge status={s.status} />
      </div>
      <p className="text-sm text-slate1 leading-snug line-clamp-3 mb-2">{s.description}</p>
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
  );
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const skills = await listSkills(params.q ? { q: params.q } : undefined);
  const grouped = groupByCategory(skills);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-1">
            Internal Audit Skill Library
          </h1>
          <p className="text-sm text-slate1">
            {skills.length} skill{skills.length === 1 ? '' : 's'} · Browse, run, or contribute.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/chat"
            className="px-4 py-2 text-sm rounded border border-line bg-white hover:bg-paper transition"
          >
            Open chat
          </Link>
          <Link
            href="/skills/wizard"
            className="px-4 py-2 text-sm rounded bg-brand text-white hover:bg-brand-dark transition font-medium"
          >
            + Create new skill
          </Link>
        </div>
      </div>

      <SearchBar initial={params.q || ''} />

      {skills.length === 0 ? (
        <div className="text-center py-16 text-slate1">
          {params.q ? `No skills match "${params.q}".` : 'No skills yet. Create the first one.'}
        </div>
      ) : (
        <div className="space-y-8 mt-6">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
            <section key={cat}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate1 mb-3 pb-1 border-b border-line">
                {CATEGORY_LABEL[cat as SkillCategory]}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[cat].map((s) => (
                  <SkillCard key={s.name} s={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
