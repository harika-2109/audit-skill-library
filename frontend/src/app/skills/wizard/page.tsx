'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { createSkill, scaffoldSkill } from '@/lib/api';
import {
  CATEGORY_DESCRIPTION,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type SkillCategory,
  type SkillScaffoldResponse,
} from '@/lib/types';

const STORAGE_KEY = 'audit-skill-wizard-v2';

// ----------------------------------------------------------
// State
// ----------------------------------------------------------

type Phase = 'intake' | 'generating' | 'review' | 'save';

interface WizardState {
  phase: Phase;
  // Intake answers — the 8 questions
  summary: string;
  category: SkillCategory | null;
  trigger: string;
  inputs: string;
  connectors: string;
  output: string;
  standards: string;
  slaMinutes: string; // string so user can clear it
  suggestedName: string;
  // Draft returned by Claude
  draft: SkillScaffoldResponse | null;
  // Editable fields once we have a draft
  name: string;
  description: string;
  argumentHint: string;
  body: string;
}

const EMPTY_STATE: WizardState = {
  phase: 'intake',
  summary: '',
  category: null,
  trigger: '',
  inputs: '',
  connectors: '',
  output: '',
  standards: '',
  slaMinutes: '',
  suggestedName: '',
  draft: null,
  name: '',
  description: '',
  argumentHint: '',
  body: '',
};

function loadDraft(): WizardState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return EMPTY_STATE;
  }
}

function saveDraft(s: WizardState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode */
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ----------------------------------------------------------
// The 8 wizard questions, as data
// ----------------------------------------------------------

interface Question {
  key: keyof Omit<WizardState, 'phase' | 'draft' | 'name' | 'description' | 'argumentHint' | 'body' | 'category'>;
  number: number;
  label: string;
  help: string;
  placeholder: string;
  required: boolean;
  minLength?: number;
  rows: number;
}

const QUESTIONS: Question[] = [
  {
    key: 'summary',
    number: 1,
    label: 'What does this skill do?',
    help: 'One sentence. Action-first. Think of how you would describe it to a peer auditor in the hallway.',
    placeholder: 'e.g., "Review vendor SOC 2 reports and identify control coverage gaps for third-party risk reviews."',
    required: true,
    minLength: 10,
    rows: 2,
  },
  // Question 2 (category) is rendered separately because it's a picker, not free text.
  {
    key: 'trigger',
    number: 3,
    label: 'When should an auditor invoke this skill?',
    help: 'The keywords, situations, and questions that should make the agent reach for this skill. Be specific.',
    placeholder: 'e.g., "When the audit team reviews third-party SOC 2 reports during vendor risk assessments, or when assessing reliance on outsourced controls during a SOX walkthrough."',
    required: true,
    minLength: 10,
    rows: 3,
  },
  {
    key: 'inputs',
    number: 4,
    label: 'What inputs does the skill require?',
    help: 'List what the auditor must provide before the skill can run. Numbered list works well.',
    placeholder: 'e.g.,\n1. Vendor name\n2. SOC 2 Type 2 report PDF\n3. Period of reliance\n4. List of controls the vendor is expected to cover',
    required: true,
    minLength: 10,
    rows: 4,
  },
  {
    key: 'connectors',
    number: 5,
    label: 'What systems or data sources does the skill touch?',
    help: 'Optional. Connectors / integrations the skill needs to function (RCM, SAP, GRC system, evidence repo, etc.).',
    placeholder: 'e.g., "Vendor risk register, GRC system (Archer or ServiceNow GRC), evidence repository (SharePoint)."',
    required: false,
    rows: 2,
  },
  {
    key: 'output',
    number: 6,
    label: 'What does the skill produce?',
    help: 'The deliverable — workpaper structure, issue write-up, report, recommendation, etc.',
    placeholder: 'e.g., "A workpaper with: control coverage matrix, identified gaps with severity, recommended compensating controls, and reviewer sign-off section."',
    required: true,
    minLength: 10,
    rows: 3,
  },
  {
    key: 'standards',
    number: 7,
    label: 'Which authoritative standards apply?',
    help: 'Optional but recommended. PCAOB AS, IIA Standards, COSO, AICPA AU-C, internal manual sections.',
    placeholder: 'e.g., "AICPA SSAE 18 (SOC 2 framework), COSO 2013, firm Third-Party Risk Management Policy §4.2."',
    required: false,
    rows: 2,
  },
  // Question 8 (SLA + suggested name) is rendered separately as numeric/text inputs.
];

// ----------------------------------------------------------
// Main page
// ----------------------------------------------------------

export default function WizardPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft(state);
  }, [state, hydrated]);

  const update = useCallback(
    (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch })),
    []
  );

  // Validation — count how many required answers are filled
  const completion = useMemo(() => {
    const required = [
      state.summary.trim().length >= 10,
      state.category !== null,
      state.trigger.trim().length >= 10,
      state.inputs.trim().length >= 10,
      state.output.trim().length >= 10,
    ];
    const optional = [
      state.connectors.trim().length > 0,
      state.standards.trim().length > 0,
      state.slaMinutes.trim().length > 0,
    ];
    return {
      requiredDone: required.filter(Boolean).length,
      requiredTotal: required.length,
      optionalDone: optional.filter(Boolean).length,
      optionalTotal: optional.length,
      ready: required.every(Boolean),
    };
  }, [state]);

  const generate = async () => {
    if (!completion.ready || !state.category) return;
    setError(null);
    setSubmitting(true);
    update({ phase: 'generating' });
    try {
      const sla = parseInt(state.slaMinutes, 10);
      const intake = {
        summary: state.summary.trim(),
        category: state.category,
        trigger: state.trigger.trim(),
        inputs: state.inputs.trim(),
        connectors: state.connectors.trim() || undefined,
        output: state.output.trim(),
        standards: state.standards.trim() || undefined,
        sla_minutes: Number.isFinite(sla) && sla > 0 ? sla : undefined,
        suggested_name: state.suggestedName.trim() || undefined,
      };
      const result = await scaffoldSkill(intake);
      update({
        phase: 'review',
        draft: result,
        name: result.name,
        description: result.description,
        argumentHint: result.argument_hint || '',
        body: result.body,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      update({ phase: 'intake' });
    } finally {
      setSubmitting(false);
    }
  };

  const save = async () => {
    if (!state.category) return;
    setError(null);
    setSubmitting(true);
    try {
      const sla = parseInt(state.slaMinutes, 10);
      const skill = await createSkill({
        name: state.name,
        description: state.description,
        argument_hint: state.argumentHint || undefined,
        category: state.category,
        body: state.body,
        sla_minutes: Number.isFinite(sla) && sla > 0 ? sla : undefined,
      });
      clearDraft();
      router.push(`/skills/${skill.name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSubmitting(false);
    }
  };

  const startOver = () => {
    if (!confirm('Discard this draft and start the wizard over?')) return;
    clearDraft();
    setState(EMPTY_STATE);
  };

  if (!hydrated) return <div className="text-slate1 text-sm">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/" className="text-sm text-slate1 hover:text-brand inline-block mb-2">
            ← Back to catalog
          </Link>
          <h1 className="text-2xl font-semibold text-ink">Create an audit skill</h1>
          <p className="text-sm text-slate1 mt-1">
            Answer 8 questions. Claude drafts the skill. You review and save.
          </p>
        </div>
        {(state.summary || state.trigger || state.inputs) && (
          <button
            onClick={startOver}
            className="text-xs text-slate1 hover:text-red-600 underline underline-offset-2"
          >
            Start over
          </button>
        )}
      </div>

      {state.phase === 'intake' && (
        <IntakeForm
          state={state}
          update={update}
          completion={completion}
          onGenerate={generate}
          submitting={submitting}
          error={error}
        />
      )}

      {state.phase === 'generating' && <GeneratingSpinner />}

      {state.phase === 'review' && (
        <ReviewStep
          name={state.name}
          description={state.description}
          argumentHint={state.argumentHint}
          body={state.body}
          notes={state.draft?.notes || []}
          category={state.category!}
          onChange={update}
          onBack={() => update({ phase: 'intake' })}
          onContinue={() => update({ phase: 'save' })}
        />
      )}

      {state.phase === 'save' && state.category && (
        <SaveStep
          name={state.name}
          description={state.description}
          argumentHint={state.argumentHint}
          category={state.category}
          slaMinutes={state.slaMinutes}
          body={state.body}
          onBack={() => update({ phase: 'review' })}
          onSave={save}
          saving={submitting}
          error={error}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------
// Intake form — the 8 questions
// ----------------------------------------------------------

function IntakeForm({
  state,
  update,
  completion,
  onGenerate,
  submitting,
  error,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  completion: ReturnType<typeof Object> & {
    requiredDone: number;
    requiredTotal: number;
    optionalDone: number;
    optionalTotal: number;
    ready: boolean;
  };
  onGenerate: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <ProgressBar completion={completion} />

      {/* Q1 — summary */}
      <QuestionBlock q={QUESTIONS[0]} value={state.summary} onChange={(v) => update({ summary: v })} />

      {/* Q2 — category picker (rendered specially) */}
      <CategoryPicker value={state.category} onPick={(c) => update({ category: c })} />

      {/* Q3 — trigger */}
      <QuestionBlock q={QUESTIONS[1]} value={state.trigger} onChange={(v) => update({ trigger: v })} />

      {/* Q4 — inputs */}
      <QuestionBlock q={QUESTIONS[2]} value={state.inputs} onChange={(v) => update({ inputs: v })} />

      {/* Q5 — connectors */}
      <QuestionBlock q={QUESTIONS[3]} value={state.connectors} onChange={(v) => update({ connectors: v })} />

      {/* Q6 — output */}
      <QuestionBlock q={QUESTIONS[4]} value={state.output} onChange={(v) => update({ output: v })} />

      {/* Q7 — standards */}
      <QuestionBlock q={QUESTIONS[5]} value={state.standards} onChange={(v) => update({ standards: v })} />

      {/* Q8 — SLA + name (two short inputs side by side) */}
      <ShortAnswersBlock
        slaMinutes={state.slaMinutes}
        suggestedName={state.suggestedName}
        onSla={(v) => update({ slaMinutes: v })}
        onName={(v) => update({ suggestedName: v })}
      />

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-800 text-sm rounded-md p-3">
          {error}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-between">
        <Link href="/" className="px-4 py-2 text-sm rounded border border-line hover:bg-paper text-slate1">
          Cancel
        </Link>
        <button
          onClick={onGenerate}
          disabled={!completion.ready || submitting}
          className="px-5 py-2 text-sm rounded bg-brand text-white hover:bg-brand-dark font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Generating…' : 'Generate skill with Claude →'}
        </button>
      </div>
    </div>
  );
}

function ProgressBar({
  completion,
}: {
  completion: { requiredDone: number; requiredTotal: number; optionalDone: number; optionalTotal: number; ready: boolean };
}) {
  const requiredPct = (completion.requiredDone / completion.requiredTotal) * 100;
  return (
    <div className="bg-paper border border-line rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate1 uppercase tracking-wider">
          Progress
        </span>
        <span className="text-xs text-slate1">
          {completion.requiredDone}/{completion.requiredTotal} required
          {completion.optionalDone > 0 && ` · ${completion.optionalDone}/${completion.optionalTotal} optional`}
        </span>
      </div>
      <div className="h-1.5 bg-white border border-line rounded-full overflow-hidden">
        <div
          className="h-full bg-brand transition-all duration-300"
          style={{ width: `${requiredPct}%` }}
        />
      </div>
      {completion.ready && (
        <p className="text-xs text-green-700 mt-2">
          ✓ Ready to generate — click below when you've added all the context you want.
        </p>
      )}
    </div>
  );
}

function QuestionBlock({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  const tooShort = q.required && q.minLength != null && value.trim().length > 0 && value.trim().length < q.minLength;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-paper border border-line text-[10px] font-semibold text-slate1">
          {q.number}
        </span>
        <label className="text-sm font-medium text-ink">
          {q.label}
          {q.required && <span className="text-brand ml-1">*</span>}
          {!q.required && <span className="text-slate2 ml-1 text-xs font-normal">(optional)</span>}
        </label>
      </div>
      <p className="text-xs text-slate1 mb-2 pl-7">{q.help}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={q.rows}
        placeholder={q.placeholder}
        className="w-full px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand-ring"
      />
      {tooShort && (
        <p className="text-xs text-amber-700 mt-1 pl-7">
          A bit more detail would help — at least {q.minLength} characters.
        </p>
      )}
    </div>
  );
}

function CategoryPicker({
  value,
  onPick,
}: {
  value: SkillCategory | null;
  onPick: (c: SkillCategory) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-paper border border-line text-[10px] font-semibold text-slate1">
          2
        </span>
        <label className="text-sm font-medium text-ink">
          Which audit category?<span className="text-brand ml-1">*</span>
        </label>
      </div>
      <p className="text-xs text-slate1 mb-2 pl-7">
        Pick the closest match. Hover for what each one covers.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            title={CATEGORY_DESCRIPTION[c]}
            className={
              'text-left border rounded-md p-3 text-sm transition hover:border-brand ' +
              (value === c
                ? 'border-brand bg-brand-light text-brand font-medium'
                : 'border-line bg-white text-ink')
            }
          >
            <div className="font-medium">{CATEGORY_LABEL[c]}</div>
            <div className="text-xs text-slate1 mt-0.5 line-clamp-2">
              {CATEGORY_DESCRIPTION[c]}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShortAnswersBlock({
  slaMinutes,
  suggestedName,
  onSla,
  onName,
}: {
  slaMinutes: string;
  suggestedName: string;
  onSla: (v: string) => void;
  onName: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-paper border border-line text-[10px] font-semibold text-slate1">
          8
        </span>
        <label className="text-sm font-medium text-ink">
          Final details <span className="text-slate2 ml-1 text-xs font-normal">(optional)</span>
        </label>
      </div>
      <p className="text-xs text-slate1 mb-2 pl-7">
        Estimated time to complete and a name suggestion. Both optional — Claude will pick a name if you skip.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate1 mb-1">Time estimate (minutes)</label>
          <input
            type="number"
            min={5}
            max={600}
            value={slaMinutes}
            onChange={(e) => onSla(e.target.value)}
            placeholder="e.g., 45"
            className="w-full px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand-ring"
          />
        </div>
        <div>
          <label className="block text-xs text-slate1 mb-1">Suggested skill name</label>
          <input
            type="text"
            value={suggestedName}
            onChange={(e) => onName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="e.g., vendor-soc2-review"
            className="w-full px-3 py-2 border border-line rounded-md text-sm font-mono focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand-ring"
          />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// Generating spinner
// ----------------------------------------------------------

function GeneratingSpinner() {
  return (
    <div className="border border-line bg-white rounded-lg p-12 text-center">
      <div className="inline-block w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-base font-semibold text-ink mb-1">
        Claude is drafting your skill…
      </h2>
      <p className="text-sm text-slate1">
        Pulling in audit standards, structuring the procedure, formatting the output template. Usually 10–20 seconds.
      </p>
    </div>
  );
}

// ----------------------------------------------------------
// Review step — edit the AI draft
// ----------------------------------------------------------

function ReviewStep({
  name,
  description,
  argumentHint,
  body,
  notes,
  category,
  onChange,
  onBack,
  onContinue,
}: {
  name: string;
  description: string;
  argumentHint: string;
  body: string;
  notes: string[];
  category: SkillCategory;
  onChange: (p: Partial<WizardState>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const ready = name.length >= 2 && description.length >= 20 && body.length >= 50;
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink mb-1">Review and edit the draft</h2>
      <p className="text-sm text-slate1 mb-5">
        Claude drafted this from your answers. Edit anything — the body is just markdown.
      </p>

      {notes.length > 0 && (
        <div className="mb-5 border border-amber-200 bg-amber-50 rounded-md p-3">
          <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1.5">
            Things to review
          </div>
          <ul className="text-sm text-amber-900 space-y-1">
            {notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-700">•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-slate1 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange({ name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            className="w-full px-3 py-2 border border-line rounded-md text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate1 mb-1">Argument hint</label>
          <input
            type="text"
            value={argumentHint}
            onChange={(e) => onChange({ argumentHint: e.target.value })}
            placeholder="<arg1> [optional]"
            className="w-full px-3 py-2 border border-line rounded-md text-sm font-mono"
          />
        </div>
      </div>

      <label className="block text-xs font-medium text-slate1 mb-1">Description</label>
      <textarea
        value={description}
        onChange={(e) => onChange({ description: e.target.value })}
        rows={3}
        className="w-full px-3 py-2 border border-line rounded-md text-sm mb-3"
      />

      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate1">
          Body (markdown) · category: <span className="font-mono">{category}</span>
        </label>
        <div className="inline-flex rounded-md border border-line bg-paper p-0.5 text-xs">
          <button
            onClick={() => setView('edit')}
            className={'px-2.5 py-1 rounded ' + (view === 'edit' ? 'bg-white text-ink shadow-sm' : 'text-slate1')}
          >
            Edit
          </button>
          <button
            onClick={() => setView('preview')}
            className={'px-2.5 py-1 rounded ' + (view === 'preview' ? 'bg-white text-ink shadow-sm' : 'text-slate1')}
          >
            Preview
          </button>
        </div>
      </div>
      {view === 'edit' ? (
        <textarea
          value={body}
          onChange={(e) => onChange({ body: e.target.value })}
          rows={20}
          className="w-full px-3 py-2 border border-line rounded-md text-sm font-mono"
        />
      ) : (
        <div className="border border-line rounded-md p-4 prose-skill bg-white min-h-[400px] text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      )}

      <div className="mt-6 pt-5 border-t border-line flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm rounded border border-line hover:bg-paper text-slate1"
        >
          ← Back to questions
        </button>
        <button
          onClick={onContinue}
          disabled={!ready}
          className="px-5 py-2 text-sm rounded bg-brand text-white hover:bg-brand-dark font-medium disabled:opacity-50"
        >
          Continue to save →
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------
// Save step
// ----------------------------------------------------------

function SaveStep({
  name,
  description,
  argumentHint,
  category,
  slaMinutes,
  body,
  onBack,
  onSave,
  saving,
  error,
}: {
  name: string;
  description: string;
  argumentHint: string;
  category: SkillCategory;
  slaMinutes: string;
  body: string;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink mb-1">Save as draft</h2>
      <p className="text-sm text-slate1 mb-5">
        New skills start in <code className="bg-paper px-1 py-0.5 rounded text-xs">draft</code> status.
        SME review and approval are required before publishing.
      </p>

      <div className="border border-line rounded-md bg-paper p-4 mb-5">
        <div className="font-mono text-xs text-slate1 mb-2">SKILL.md preview</div>
        <pre className="text-xs bg-white border border-line rounded p-3 overflow-x-auto">
{`---
name: ${name}
description: ${description}${argumentHint ? `\nargument-hint: ${argumentHint}` : ''}
category: ${category}
status: draft
version: 0.1.0${slaMinutes ? `\nsla_minutes: ${slaMinutes}` : ''}
---

${body.slice(0, 280)}${body.length > 280 ? '\n…' : ''}`}
        </pre>
      </div>

      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 text-red-800 text-sm rounded-md p-3">
          {error}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm rounded border border-line hover:bg-paper text-slate1"
        >
          ← Back to review
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 text-sm rounded bg-brand text-white hover:bg-brand-dark font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save as draft'}
        </button>
      </div>
    </div>
  );
}
