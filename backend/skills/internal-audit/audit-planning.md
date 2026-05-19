---
name: audit-planning
description: Build an engagement plan for a specific audit. Use when scoping a new audit engagement, drafting the engagement letter, building the audit program, estimating hours and team composition, or preparing the planning memo. Produces an objective statement, risk-based scope, audit program outline, resource plan, and timeline.
argument-hint: "<audit_name> [scope_hint]"
owner: internal-audit
category: planning
status: published
version: 1.2.0
sla_minutes: 45
---

# /audit-planning

> Connectors needed: prior audit reports, current RCM for in-scope processes, RAU registry, time tracking for benchmarks. See [CONNECTORS.md](../../CONNECTORS.md).

Produces a complete engagement planning package: objectives, risk-based scope, audit program, team plan, and timeline. Pulls from prior engagement results and current risk assessment to ensure continuity.

## Trigger

Auditor runs `/audit-planning` with an audit name, or asks to plan an audit, build an engagement letter, draft an audit program, or scope an engagement.

## Inputs

1. **Audit name** — descriptive (e.g., "Wire Transfer Operations FY26 Q2")
2. **Scope hint** (optional) — process, entity, theme, or regulatory driver
3. **Drivers** (optional) — annual plan, special request, regulatory commitment, follow-up
4. **Constraints** — budget hours, deadline, specialist availability

## Process

### 1. Objective drafting

Frame 2–4 specific, testable objectives:

- Each objective must be evaluable as "achieved", "partially achieved", or "not achieved"
- Objectives map to risks identified in risk assessment, not to processes
- Avoid open-ended "review process X" objectives

Good: *"Evaluate whether wire transfer authorization controls operate to prevent unauthorized release of funds above approval thresholds."*

Weak: *"Review the wire transfer process."*

### 2. Risk-based scope

Pull from `risk-assessment` skill output (or run it if not current):
- Top residual risks for the RAU(s) in scope
- Prior issues — closure status, repeat risk
- Recent changes — system, regulatory, organizational
- Regulatory exam findings on related processes

For each in-scope risk, identify the key controls to test. Document explicit out-of-scope items with rationale (especially common scope-creep traps).

### 3. Audit program outline

Standard program sections:

- **Planning** — risk understanding, walkthroughs, RCM refresh, control identification
- **Fieldwork — design effectiveness** — control design walkthroughs and gap analysis
- **Fieldwork — operating effectiveness** — sample testing
- **Substantive procedures** — if reliance on controls is not appropriate
- **Reporting** — issue drafting, validation, report production

For each section, draft procedures linking back to objectives.

### 4. Resource plan

| Role | Hours | Notes |
|---|---|---|
| Engagement lead | x | Sr Manager or Director |
| In-charge | x | Manager |
| Auditor — senior | x | |
| Auditor — staff | x | |
| IT audit specialist | x | If automated controls in scope |
| Model risk specialist | x | If models in scope |
| Data analytics | x | If population analytics planned |
| QA reviewer | x | Independent reviewer |

Cross-check against historical hours for similar audits — flag if estimate is >30% above or below benchmark.

### 5. Timeline

Standard durations (adjust per scope):
- Planning: 2–3 weeks
- Walkthroughs and RCM: 2 weeks
- Testing: 4–8 weeks
- Reporting and validation: 3–4 weeks

Map to calendar with key milestones: planning memo, fieldwork start, draft report, exit meeting, final report.

### 6. Stakeholder map

Capture: audit sponsor (1LoD leader), key control owners, 2LoD partners, executive sponsor, audit committee touchpoints. For each — what they need from this engagement.

## Output

```
Audit Engagement Plan — {audit_name}
Period: {start} to {end}

## 1. Objectives
1. {testable objective}
2. {testable objective}
...

## 2. Background
Driver: {annual plan | regulatory | special request | follow-up}
Prior coverage: {last audit date, rating, open issues}
Recent changes: {system, regulatory, organizational}

## 3. Risk basis
Top residual risks driving scope:
1. {risk and rationale}
2. {risk}

## 4. Scope
In scope:
- {process or sub-process}
- {process or sub-process}

Out of scope (explicit):
- {item} — rationale: {why excluded}

## 5. Audit program
### Planning
- {procedure}
### Fieldwork — design
- {procedure}
### Fieldwork — operating
- {procedure}
### Reporting
- {procedure}

## 6. Team and hours
| Role | Hours | Person |

Total: {hours}
Benchmark comparison: {within / above / below typical, with rationale}

## 7. Timeline
| Milestone | Target date |

## 8. Stakeholders
| Name | Role | What they need |

## 9. Key risks to the engagement
- {risk to delivery, mitigation}

## 10. Sign-off
Engagement lead: {name}
Audit head: {name}
Date: {date}
```

## Evals

Evaluated against `evals/audit-planning/` — 10 historical engagements with realized outcomes (hours actual vs. estimate, scope changes, issue counts). Promotion gate: objective testability scored ≥ 4/5 by reviewer; hours estimate within ±25% of actual on benchmark sample.

## Citations

- IIA Standard 2200 — Engagement Planning
- IIA Standard 2210 — Engagement Objectives
- IIA Standard 2220 — Engagement Scope
- Firm Internal Audit Manual §3.1 — Engagement Planning
