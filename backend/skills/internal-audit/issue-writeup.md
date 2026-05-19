---
name: issue-writeup
description: Draft an audit issue using the 5C framework (Criteria, Condition, Cause, Consequence, Corrective action). Use when a deficiency or finding has been identified during testing, when converting field notes into a formal issue, or when preparing issues for the issue tracking system. Produces a fully-formed issue with severity rating, root cause analysis, and management response template.
argument-hint: "<finding_summary> [severity]"
owner: internal-audit
category: reporting
status: published
version: 1.3.0
sla_minutes: 25
---

# /issue-writeup

> Connectors needed: issue tracking system, prior issues for cross-reference, GRC control library. See [CONNECTORS.md](../../CONNECTORS.md).

Converts a raw finding into a publication-ready audit issue using the 5C framework. Auto-suggests severity, identifies systemic vs. isolated nature, drafts management action language, and cross-references related open issues.

## Trigger

Auditor runs `/issue-writeup` with a finding description, or asks to draft an issue, write up a finding, document a deficiency, or convert testing exceptions into an issue.

## Inputs

1. **Finding summary** — 1–3 sentence raw description from testing
2. **Severity** (optional, will suggest if absent) — high / medium / low
3. **Context** — engagement name, control ID, test ref, exception ratio
4. **Quantification** — error rate, dollar impact, periods affected
5. **Owner candidates** — likely management owner

## Process

### 1. Severity calibration

Apply firm framework:

| Severity | Definition | Typical triggers |
|---|---|---|
| **High** | Significant risk to financial reporting, regulatory compliance, or large operational/financial exposure. Requires senior management response. | Material weakness candidates, regulatory findings repeats, significant fraud risk, >$X impact |
| **Medium** | Process or control weakness with meaningful but contained exposure. | Single significant deficiency, systemic but limited-scope gap |
| **Low** | Process improvement opportunity or minor control weakness. | Documentation gaps, infrequent exceptions, near-misses |

When suggesting, document the trigger applied.

### 2. 5C framework

Each issue has five required sections:

- **Criteria** — what should be happening (cite the standard, policy, regulation, control design)
- **Condition** — what is actually happening (the observation, quantified)
- **Cause** — why the gap exists (root cause, not symptom — use 5-whys discipline)
- **Consequence** — what is at risk (financial, regulatory, operational, reputational — be specific)
- **Corrective action** — what management will do (with deadline) and what monitoring will verify

### 3. Root cause discipline

Push past surface causes. For each candidate cause, ask "why?" until a structural answer emerges:

- "Reviewer missed the exception" → why? → "Review checklist doesn't include this attribute" → why? → "Control design didn't anticipate this transaction type" → **root cause: control design gap**, not "reviewer error"

Categorize root cause:
- Design gap, training gap, system limitation, process gap, oversight gap, intentional override

### 4. Cross-reference

Search open issues and prior issues for:
- **Repeat finding** — same root cause within 3 years → escalate severity by one level, note in writeup
- **Related theme** — different control, same systemic driver → reference as theme
- **Pattern across entities** — same finding in multiple RAUs → recommend horizontal review

### 5. Management response scaffolding

Draft an empty response with the right shape — DO NOT write management's answer for them, but provide the structure:

```
Management response:
- Action owner: [name]
- Action description: [what will be done]
- Target completion: [date]
- Interim mitigation: [if applicable]
- Validation evidence: [what auditor will accept as closure]
```

## Output

```
Issue: {short_title}

Engagement: {name}
Control ID(s): {refs}
Test ref: {refs}
Severity: {High | Medium | Low}
Severity rationale: {trigger applied}
Repeat finding: {yes/no — if yes, prior issue ref}

## Criteria
{cite: policy / standard / control design}

## Condition
{what we observed, with quantification}
- Population tested: {n}
- Exceptions: {n} ({rate}%)
- Dollar exposure: ${amount}
- Periods affected: {dates}

## Cause
{root cause from 5-whys}
Category: {design | training | system | process | oversight | override}
Systemic: {yes/no — basis}

## Consequence
Financial: {if applicable}
Regulatory: {if applicable}
Operational: {if applicable}
Reputational: {if applicable}

## Recommendation
{specific, actionable, addresses root cause}

## Management response
- Action owner: [TBD]
- Action description: [TBD]
- Target completion: [TBD]
- Interim mitigation: [TBD]
- Validation evidence: [TBD]

## Related issues
{cross-references}
```

## Evals

Evaluated against `evals/issue-writeup/` — 20 historical issues with peer-reviewed quality scores. Promotion gate: 5C completeness 100%, severity suggestion within one level of human reviewer 90%+, root cause depth scored as "structural" (not surface) by reviewer 80%+.

## Citations

- IIA Standard 2410 — Criteria for Communicating
- IIA Standard 2420 — Quality of Communications
- Firm Internal Audit Manual §5.1 — Issue Writing Standards
