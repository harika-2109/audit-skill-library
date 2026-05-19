import type {
  Skill,
  SkillCategory,
  SkillCreateRequest,
  SkillScaffoldResponse,
  SkillStatus,
  SkillSummary,
  WizardIntake,
} from './types';

// Server-side fetch uses an absolute URL (no rewrites); client-side fetch uses
// a relative URL and the rewrite in next.config.js takes over.
const BASE =
  typeof window === 'undefined'
    ? process.env.BACKEND_URL || 'http://localhost:8000'
    : '';

async function jsonOrThrow<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${r.status} ${r.statusText}: ${text}`);
  }
  return r.json();
}

export async function listSkills(opts?: {
  category?: SkillCategory;
  status?: SkillStatus;
  q?: string;
}): Promise<SkillSummary[]> {
  const params = new URLSearchParams();
  if (opts?.category) params.set('category', opts.category);
  if (opts?.status) params.set('status', opts.status);
  if (opts?.q) params.set('q', opts.q);
  const r = await fetch(
    `${BASE}/api/skills${params.toString() ? '?' + params.toString() : ''}`,
    { cache: 'no-store' }
  );
  return jsonOrThrow<SkillSummary[]>(r);
}

export async function getSkill(name: string): Promise<Skill> {
  const r = await fetch(`${BASE}/api/skills/${name}`, { cache: 'no-store' });
  return jsonOrThrow<Skill>(r);
}

export async function createSkill(req: SkillCreateRequest): Promise<Skill> {
  const r = await fetch(`${BASE}/api/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return jsonOrThrow<Skill>(r);
}

export async function deleteSkill(name: string): Promise<void> {
  const r = await fetch(`${BASE}/api/skills/${name}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) {
    throw new Error(`${r.status}: ${await r.text()}`);
  }
}

export async function scaffoldSkill(intake: WizardIntake): Promise<SkillScaffoldResponse> {
  const r = await fetch(`${BASE}/api/scaffold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intake),
  });
  return jsonOrThrow<SkillScaffoldResponse>(r);
}

export async function* streamChat(
  messages: { role: string; content: string }[],
  skillContext?: string
): AsyncGenerator<string> {
  const r = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, skill_context: skillContext }),
  });
  if (!r.ok || !r.body) throw new Error(`Chat error: ${r.status}`);
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.type === 'delta') yield payload.text;
        else if (payload.type === 'error') throw new Error(payload.error);
      } catch {
        /* skip malformed */
      }
    }
  }
}
