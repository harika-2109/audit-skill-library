---
name: continuous-controls-monitoring
description: Design or refresh a continuous controls monitoring (CCM) routine for a key control. Use when converting a manual quarterly control test into automated continuous monitoring, designing exception alerts, building a CCM dashboard tile, or recommending controls suitable for CCM coverage. Produces a monitoring spec, alert thresholds, and exception triage workflow.
argument-hint: "<control_id> [data_source]"
owner: internal-audit
category: monitoring
status: published
version: 1.0.0
sla_minutes: 40
---

# /continuous-controls-monitoring

> Connectors needed: data warehouse, control library, alerting platform, exception triage queue. See [CONNECTORS.md](../../CONNECTORS.md).

Designs a continuous monitoring routine for a control: data sources, monitoring logic, exception thresholds, alerting, and triage workflow. Converts periodic manual testing into ongoing data-driven assurance.

## Trigger

Auditor runs `/continuous-controls-monitoring` with a control ID, or asks to set up CCM, automate control testing, build a monitoring dashboard, or recommend CCM candidates.

## Inputs

1. **Control ID** — the control to monitor
2. **Data source** (optional) — known good source for the monitoring data
3. **Trigger** — annual CCM refresh, new control, audit recommendation, automation initiative

## Process

### 1. CCM suitability check

Not every control is a good CCM candidate. Assess:

| Criterion | Suitable | Less suitable |
|---|---|---|
| Data availability | Structured, accessible, reliable | Manual records, spreadsheets, no system trace |
| Volume | High-frequency transactions | Low-volume judgmental decisions |
| Logic clarity | Rules-based attributes | Heavily judgmental controls |
| Exception value | Clear, actionable exceptions | Noisy, hard-to-triage signals |

If unsuitable → recommend periodic testing instead and document why.

### 2. Monitoring logic design

For the control's key attributes, define monitoring queries:

- **Existence checks** — count of control events vs. expected (e.g., daily reviews logged ≥ business days)
- **Authorization checks** — approver authority matches DOA; segregation of duties (initiator ≠ approver)
- **Threshold checks** — items above limits, items just under thresholds (split detection)
- **Timeliness checks** — review completed within SLA
- **Completeness checks** — sample data reconciles to source totals
- **Trend checks** — rolling exception rate exceeds baseline by X sigma

Document each query with: data source, refresh frequency, logic, expected result.

### 3. Threshold setting

For each monitoring query, set:
- **Green** — within expected range, no action
- **Amber** — outside expected but explainable; triage required
- **Red** — clear control breakdown; immediate escalation

Calibrate against historical data — false positive rate target < 10% to maintain operator trust.

### 4. Alert and triage workflow

Define:
- **Recipient** — control owner, 2LoD oversight, IA contact
- **Frequency** — real-time, daily digest, weekly summary
- **Triage SLA** — amber within 5 business days, red within 1 business day
- **Disposition options** — confirmed exception, false positive (with feedback to improve query), explained (with reason code), escalated to issue
- **Audit trail** — every alert and disposition logged for IA review

### 5. Audit reliance

Document how IA will use CCM output:
- **Frequency of IA review** — quarterly review of triaged exceptions, dispositions, false positive rate
- **Re-performance scope** — sample of false positives and explained items to verify triage quality
- **Annual recalibration** — review thresholds and logic against current risk

This is the key shift: CCM does not replace audit work, it shifts it from "did the control happen?" to "is the monitoring of the control trustworthy?"

## Output

```
CCM Spec — {control_id}
Control: {control_name}
Owner: {control_owner}
2LoD oversight: {team}
IA contact: {auditor}

## 1. Suitability assessment
{suitable | partial | not suitable} — rationale: {basis}

## 2. Data sources
| Source | System | Refresh | Notes |

## 3. Monitoring queries
### Query 1 — {attribute}
SQL/logic: {pseudocode or query}
Refresh: {real-time | daily | weekly}
Green: {range}
Amber: {range}
Red: {range}

### Query 2 — ...
...

## 4. Alert routing
| Trigger | Recipient | Channel | SLA |

## 5. Triage workflow
1. Alert raised
2. {recipient} acknowledges within {SLA}
3. Triage to: confirmed | false positive | explained | escalated
4. Disposition recorded with reason code
5. Issue created if escalated

## 6. Audit reliance
Quarterly IA review of: {scope}
Annual recalibration: {month}
Re-performance sample: {%}

## 7. Performance KPIs
- False positive rate: target <10%
- Triage SLA compliance: target >95%
- Mean time to disposition: baseline + monitoring
- Issues raised from CCM: tracked

## 8. Implementation
Build owner: {team}
Estimated effort: {hours}
Go-live target: {date}
Pilot period: {duration before audit reliance}
```

## Evals

Evaluated against `evals/continuous-controls-monitoring/` — 8 historical CCM implementations with realized false positive rates and effectiveness data. Promotion gate: suitability assessment matches expert review 90%+; threshold recommendations within reasonable range of post-pilot calibrated values.

## Citations

- IIA GTAG — Continuous Auditing and Continuous Monitoring
- COSO 2013 — Component 5 (Monitoring Activities)
- Firm Internal Audit Manual §6.2 — CCM and Reliance Standards
