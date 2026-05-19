---
name: rcm-walkthrough
description: Document a process walkthrough and build or update an RCM. Use when performing a process walkthrough with a control owner, building a Risk Control Matrix for a new or changed process, or refreshing an existing RCM after a process change. Produces narrative, flowchart-ready process map, and structured RCM rows.
argument-hint: "<process_name> [sub_process]"
owner: internal-audit
category: documentation
status: published
version: 1.2.0
sla_minutes: 50
---

# /rcm-walkthrough

> Connectors needed: process documentation repo, prior RCMs, GRC system for control library. See [CONNECTORS.md](../../CONNECTORS.md).

Walks a control owner through a process end-to-end, captures the narrative, identifies risk points, maps controls, and produces an RCM (Risk Control Matrix) ready for testing.

## Trigger

Auditor runs `/rcm-walkthrough` with a process name, or asks to document a walkthrough, build an RCM, map controls to risks, or update process documentation after change.

## Inputs

1. **Process name** — the end-to-end process being walked (e.g., "Wire transfer processing", "Vendor onboarding")
2. **Sub-process** (optional) — narrower scope
3. **Walkthrough transcript or notes** — paste raw notes; the skill will structure them
4. **Prior RCM** (optional) — reference for incremental refresh

## Process

### 1. Narrative structure

Convert raw walkthrough notes into structured narrative:

- **Trigger** — what initiates the process
- **Inputs** — data, documents, approvals required to start
- **Process steps** — sequential, numbered, one actor per step
- **Decision points** — branches with conditions
- **Systems and handoffs** — every system involved, every handoff between teams
- **Outputs** — deliverables, downstream consumers
- **Exception paths** — what happens when validation fails

Each step format: `Step N — {actor} {action} using {system}, producing {output}, taking ~{time}.`

### 2. Risk identification

For each step, ask:
- What could go wrong here?
- What assertion would be affected (existence, completeness, accuracy, valuation, presentation, rights/obligations, cutoff)?
- What is the inherent likelihood and impact?

Categorize risks: financial reporting, regulatory, operational, fraud, IT, third-party.

### 3. Control mapping

For each risk, identify the control that mitigates it. Capture:

| Field | Required | Notes |
|---|---|---|
| Control ID | Yes | Use firm taxonomy (e.g., FR-PAY-08) |
| Control name | Yes | Short descriptive |
| Description | Yes | What the control does, who performs it, when |
| Control owner | Yes | Role, not individual |
| Frequency | Yes | Daily, weekly, monthly, quarterly, annual, ad-hoc |
| Type | Yes | Preventive / Detective |
| Nature | Yes | Manual / Automated / ITDM |
| Risk addressed | Yes | Reference to risk row |
| Assertions | Yes | E, C, A, V, P, R, Cu |
| Evidence | Yes | What gets retained as evidence |
| Key control flag | Yes | SOX key, regulatory key, management key, none |
| Compensating | If applicable | Other controls that mitigate same risk |

### 4. Gaps and observations

Flag during walkthrough:
- **Risks with no control** — control gap
- **Controls without evidence** — testability gap
- **Manual controls performing high-volume work** — automation opportunity
- **Single points of failure** — segregation of duties issue
- **Stale documentation** — drift between documented and actual process

### 5. Validation

End-of-walkthrough validation checklist with the control owner:
- [ ] Process steps match actual practice (not aspirational)
- [ ] All systems named correctly
- [ ] All handoffs identified
- [ ] Frequency claims supported by recent evidence
- [ ] Control owner confirms ownership

## Output

```
Process: {process_name}
Date: {walkthrough_date}
Participants: {names, roles}
Auditor: {name}

## 1. Narrative
{structured step-by-step}

## 2. Process flow
{Mermaid flowchart syntax — renders in catalog}
flowchart TD
  A[Trigger] --> B[Step 1]
  B --> C{Decision}
  ...

## 3. Risk and control matrix
| Risk ID | Risk | Step | Control ID | Control | Owner | Freq | Type | Nature | Assertions | Key? |

## 4. Observations and gaps
| ID | Type | Description | Severity | Recommended action |

## 5. Validation
Walked through with: {owner_name}
Confirmed accurate: {yes/no}
Open follow-ups: {list}
```

## Evals

Evaluated against `evals/rcm-walkthrough/` — 8 historical walkthroughs with auditor-reviewed RCMs as ground truth. Promotion gate: control attributes captured ≥ 95% completeness; no missing key controls vs. ground truth.

## Citations

- COSO 2013 — Component 3 (Control Activities)
- IIA Standard 2240 — Engagement Work Program
- Firm Internal Audit Manual §3.2 — Process Documentation Standards
