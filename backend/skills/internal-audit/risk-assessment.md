---
name: risk-assessment
description: Build or refresh a risk assessment for an auditable entity. Use when scoping an annual audit plan, refreshing inherent and residual risk ratings for a business process or legal entity, or scoring a Risk Assessable Unit (RAU). Produces a scored risk profile, heat map, and audit plan recommendation.
argument-hint: "<rau_or_entity_name> [year]"
owner: internal-audit
category: planning
status: published
version: 2.1.0
sla_minutes: 60
---

# /risk-assessment

> Connectors needed: RAU registry, prior audit reports, loss event data, regulatory exam findings. See [CONNECTORS.md](../../CONNECTORS.md).

Performs a structured risk assessment for a Risk Assessable Unit (RAU) — process, sub-process, legal entity, or shared service. Quantifies inherent risk, evaluates control environment maturity, computes residual risk, and recommends audit frequency.

## Trigger

Auditor runs `/risk-assessment` with an RAU name, or asks to score risk, build the annual audit plan, refresh a risk rating, or rank entities for coverage.

## Inputs

1. **RAU name or ID** — the unit being assessed
2. **Assessment year** — default current year
3. **Scope** — process, entity, or enterprise-level (default: process)

## Process

### 1. Inherent risk dimensions

Score each on 1–5 scale, document rationale per dimension:

| Dimension | Drivers |
|---|---|
| Financial materiality | Revenue, assets, expense, AUM exposure |
| Regulatory exposure | Number and severity of applicable regulations (SOX, BSA/AML, OCC SR, FRB, CCAR, BCBS 239) |
| Operational complexity | Process volume, manual touchpoints, system count, geographic spread |
| Change velocity | Recent reorgs, system implementations, M&A, new products |
| External environment | Macro stress, fraud landscape, peer events |
| Reputational impact | Customer exposure, public visibility, media risk |

**Inherent risk score** = weighted average (default weights: financial 25%, regulatory 25%, operational 15%, change 15%, external 10%, reputational 10%). Weights adjustable per RAU type.

### 2. Control environment assessment

Evaluate three lines of defense maturity (1–5 scale):

- **1st LoD** — process-level controls, supervisory review, automated controls coverage
- **2nd LoD** — compliance, risk management, independent challenge frequency and depth
- **3rd LoD** — prior audit coverage, time since last audit, finding closure rate

Pull from: prior audit reports (last 3 years), open issues aging, regulatory exam findings, loss events ≥ threshold, KRI breaches.

### 3. Residual risk calculation

```
residual_risk = inherent_risk × (1 - control_effectiveness_factor)
control_effectiveness_factor = 0.1 × (avg_LoD_maturity - 1)
```

Examples:
- Inherent 4.0, control maturity 3.0 → residual 3.2
- Inherent 4.0, control maturity 1.5 → residual 3.8
- Inherent 4.0, control maturity 4.5 → residual 2.6

### 4. Coverage recommendation

| Residual risk | Audit frequency | Rationale |
|---|---|---|
| 4.0–5.0 | Annual, full scope | High residual demands continuous coverage |
| 3.0–3.9 | Annual, rotational scope | Sub-process rotation each year |
| 2.0–2.9 | Every 2 years | Targeted thematic review acceptable |
| 1.0–1.9 | Every 3 years | Monitoring through CCM acceptable |

### 5. Cross-RAU views

When run at enterprise scope, produce:
- Heat map (inherent × residual scatter)
- Top 10 residual risk RAUs
- Coverage gaps — RAUs with residual ≥ 3.0 not audited in prior 2 years
- Theme clustering — RAUs with shared risk drivers

## Output

```
Risk Assessment — {rau_name} — {year}

## Scoring summary
Inherent risk:     {score} / 5.0
Control maturity:  {score} / 5.0
Residual risk:     {score} / 5.0
Audit recommendation: {frequency}

## Inherent risk detail
| Dimension | Score | Weight | Rationale |

## Control environment detail
| LoD | Maturity | Evidence basis |
| 1st | x.x | {summary of process controls assessed} |
| 2nd | x.x | {summary of 2LoD activities reviewed} |
| 3rd | x.x | {prior audit coverage, issue aging, exam findings} |

## Key risk drivers
1. {top driver with quantification}
2. {second driver}
3. {third driver}

## Coverage history
| Year | Engagement | Scope | Rating | Open issues |

## Recommended audit
Scope: {process areas to cover}
Estimated hours: {range}
Specialist needs: {IT audit, model risk, etc.}
Timing: {Q1/Q2/Q3/Q4}
```

## Evals

Evaluated against `evals/risk-assessment/` — 10 historical RAUs where the actual subsequent audit outcomes are known. Promotion gate: residual risk score within ±0.5 of human-reviewed baseline; coverage recommendation matches expert judgment 80%+.

## Citations

- IIA Standard 2010 — Planning
- IIA Standard 2120 — Risk Management
- OCC Heightened Standards — risk governance expectations
- Firm Internal Audit Manual §2.1 — Annual Risk Assessment
