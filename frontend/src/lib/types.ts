export type SkillCategory =
  | 'planning'
  | 'documentation'
  | 'sox'
  | 'testing'
  | 'reporting'
  | 'regulatory'
  | 'monitoring';

export type SkillStatus = 'draft' | 'in_review' | 'published' | 'deprecated';

export interface SkillSummary {
  name: string;
  description: string;
  category: SkillCategory;
  status: SkillStatus;
  version: string;
  sla_minutes: number | null;
  updated_at: string;
}

export interface Skill extends SkillSummary {
  argument_hint: string | null;
  owner: string;
  body: string;
  file_path: string;
}

export interface SkillCreateRequest {
  name: string;
  description: string;
  argument_hint?: string;
  category: SkillCategory;
  body: string;
  sla_minutes?: number;
}

export interface WizardIntake {
  summary: string;
  category: SkillCategory;
  trigger: string;
  inputs: string;
  connectors?: string;
  output: string;
  standards?: string;
  sla_minutes?: number;
  suggested_name?: string;
}

export interface SkillScaffoldResponse {
  name: string;
  description: string;
  argument_hint: string | null;
  body: string;
  notes: string[];
}

export const CATEGORY_LABEL: Record<SkillCategory, string> = {
  planning: 'Planning',
  documentation: 'Documentation',
  sox: 'SOX',
  testing: 'Testing',
  reporting: 'Reporting',
  regulatory: 'Regulatory',
  monitoring: 'Monitoring',
};

export const CATEGORY_DESCRIPTION: Record<SkillCategory, string> = {
  planning: 'Annual audit planning, engagement scoping, risk assessment.',
  documentation: 'Process walkthroughs, RCM, narratives.',
  sox: 'SOX 404 control testing — design and operating effectiveness.',
  testing: 'Sampling, substantive testing, evidence procedures.',
  reporting: 'Issue write-ups, audit reports, executive summaries.',
  regulatory: 'Regulatory mapping, exam prep, MRA responses.',
  monitoring: 'Continuous controls monitoring, KRI design.',
};

export const CATEGORY_ORDER: SkillCategory[] = [
  'planning',
  'documentation',
  'sox',
  'testing',
  'reporting',
  'regulatory',
  'monitoring',
];
