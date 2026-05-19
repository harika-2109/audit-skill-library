---
name: regulatory-mapping
description: Map regulatory requirements to controls and identify coverage gaps. Use when a new regulation is issued, when refreshing reg-to-control mapping for an exam, when responding to OCC or FRB MRAs, or when assessing readiness for a specific regulation. Produces a coverage matrix, gap list, and remediation priorities.
argument-hint: "<regulation> [scope]"
owner: internal-audit
category: regulatory
status: published
version: 1.0.0
sla_minutes: 60
---

# /regulatory-mapping

> Connectors needed: regulatory library, GRC control library, OCC/FRB exam findings repository. See [CONNECTORS.md](../../CONNECTORS.md).

Maps a specific regulation, regulatory standard, or supervisory expectation to existing controls. Identifies coverage gaps, evaluates control adequacy, and prioritizes remediation. Common targets: SR 11-7, OCC Heightened Standards, BSA/AML, CCAR, BCBS 239, NYDFS 500.

## Trigger

Auditor runs `/regulatory-mapping`, or asks to map a regulation to controls, prepare for an exam, respond to an MRA/MRIA, assess regulatory coverage, or build a reg-to-control matrix.

## Inputs

1. **Regulation** — the regulation, guidance, or standard (full name and section if narrower scope)
2. **Scope** (optional) — specific entity, business line, or enterprise
3. **Trigger** (optional) — new issuance, exam prep, MRA response, periodic refresh

## Process

### 1. Regulation decomposition

Break the regulation into individual requirements at the lowest enforceable unit:

- For SR letters → individual expectations within each guidance section
- For OCC heightened standards → each standard
- For BSA/AML → each pillar (customer ID, transaction monitoring, SAR filing, training, audit, designated officer)
- For CCAR → each capital plan element and qualitative dimension

Each requirement gets a unique reference (e.g., `SR-11-7.III.A.2`).

### 2. Control inventory pull

For each requirement, search control library by:
- Keyword match on requirement text
- Risk taxonomy linkage
- Control owner business area
- Prior mapping (if regulation was mapped previously, surface delta)

### 3. Mapping assessment

For each requirement, evaluate coverage as one of:

| Status | Definition |
|---|---|
| **Covered** | One or more controls fully address the requirement |
| **Partial** | Controls address part of the requirement but gaps remain |
| **Not covered** | No control addresses this requirement |
| **Indirect** | Coverage comes through process design rather than discrete control — document the design element |
| **Out of scope** | Requirement does not apply to this entity (document reasoning) |

For "Partial" and "Not covered" — flag as gap and assess severity.

### 4. Control adequacy assessment

Even where controls exist, ask:
- Does the control's frequency match the regulation's expectation?
- Does the control's evidence support the regulator's expected scrutiny?
- Is the control tested? When was last test? Result?
- Are there compensating controls?

A "covered but inadequate" control is a gap, just a softer one.

### 5. Gap prioritization

Rank gaps by:
1. **Regulatory consequence** — MRA candidate, public consent order risk, fine exposure
2. **Time to remediate** — quick wins vs. structural changes
3. **Operational lift** — control build effort, ongoing operating cost
4. **Cross-dependency** — gaps that block other remediations

## Output

```
Regulatory Mapping — {regulation} — {scope}
Date: {date}
Source documents: {citations}

## 1. Coverage summary
Total requirements: {n}
Covered: {n} ({pct}%)
Partial: {n}
Not covered: {n}
Indirect: {n}
Out of scope: {n}

## 2. Requirement-to-control matrix
| Req ID | Requirement (summary) | Mapped controls | Status | Last test | Notes |

## 3. Gap detail
| Gap ID | Requirement | Why gap | Severity | Suggested remediation | Owner |

## 4. Adequacy concerns (covered but weak)
| Control | Requirement | Concern | Recommended action |

## 5. Prioritized remediation roadmap
| # | Gap | Severity | Effort | Owner | Target date |

## 6. Recommended exam talking points
{2-3 narratives positioning coverage story for examiners}
```

## Evals

Evaluated against `evals/regulatory-mapping/` — 6 historical mappings (SR 11-7, OCC HS, BSA/AML, CCAR, BCBS 239, NYDFS 500) with expert-reviewed coverage assessments. Promotion gate: requirement decomposition completeness 95%+; gap identification matches expert review 85%+.

## Citations

- Specific regulation (e.g., SR 11-7 Guidance on Model Risk Management)
- IIA Standard 2110 — Governance
- Firm Internal Audit Manual §2.4 — Regulatory Coverage Assessment
- Firm Regulatory Inventory (maintained by Compliance)
