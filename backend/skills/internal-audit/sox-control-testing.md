---
name: sox-control-testing
description: Run a SOX control test from RCM to workpaper. Use when testing a key control under SOX 404, performing design and operating effectiveness procedures, evaluating deficiencies, or producing a test workpaper. Pulls the control from the RCM, generates sample size based on frequency, drafts test steps, and produces a workpaper with deficiency evaluation.
argument-hint: "<control_id> [test_period]"
owner: internal-audit
category: sox
status: published
version: 1.4.0
sla_minutes: 45
---

# /sox-control-testing

> Connectors needed: RCM (GRC system), evidence repository, SAP read-only for transaction sampling. See [CONNECTORS.md](../../CONNECTORS.md).

Tests a SOX 404 key control end-to-end. Pulls the control definition, scopes the test, draws a defensible sample, drafts test procedures aligned to control attributes, evaluates results against the deficiency framework, and produces an auditor-reviewable workpaper.

## Trigger

Auditor runs `/sox-control-testing` with a control ID, or asks to test a SOX control, perform walkthrough plus testing, or evaluate control operating effectiveness.

## Inputs

Gather the following. If not provided, ask before proceeding:

1. **Control ID** — the RCM identifier (e.g., `FR-REV-04`)
2. **Test period** — fiscal quarter or full year (default: current quarter)
3. **Test type** — one of:
   - **Design effectiveness** — does the control as designed address the risk
   - **Operating effectiveness** — is the control operating as designed across the period
   - **Both** — full year-1 testing
4. **Population source** (optional) — SAP module, system report, or manual log

## Process

### 1. Control intake

Pull control from RCM. Capture: control owner, frequency, control type (preventive/detective, manual/automated/ITDM), assertion coverage, related risk, prior-year test results, prior deficiencies.

**If automated control**: verify ITGC reliance — coordinate with IT audit before proceeding. Note IPE (information produced by entity) dependencies.

### 2. Sample sizing

Apply the firm's standard sample sizing matrix:

| Frequency | Population | Sample (no deficiency prior year) | Sample (deficiency prior year) |
|---|---|---|---|
| Annual | 1 | 1 | 1 |
| Quarterly | 4 | 2 | 4 |
| Monthly | 12 | 2–5 | 5–8 |
| Weekly | 52 | 5–15 | 15–25 |
| Daily | 250+ | 25–40 | 40–60 |
| Multiple times/day | >250 | 25–40 | 40–60 |

Document sampling methodology (haphazard, systematic, judgmental, statistical). Justify if deviating from the matrix.

### 3. Test procedures

Draft test steps using the control attribute framework — for each attribute the control claims to address, write one or more procedures:

- **Existence/occurrence** — inspect evidence the control event happened
- **Authorization** — verify approver had authority per DOA
- **Accuracy** — recompute or independently verify
- **Completeness** — reconcile population to source system
- **Timeliness** — verify control executed within stated SLA

For each sample item, populate a test row: sample reference, date, evidence reviewed, attribute results (pass/fail per attribute), exceptions noted.

### 4. Exception evaluation

If any sample item fails any attribute:

1. **Root cause** — isolated breakdown, systemic gap, or design flaw
2. **Compensating controls** — identify and test any compensating control
3. **Quantify** — error rate, dollar impact, periods affected
4. **Severity** — apply firm's deficiency framework:
   - **Control deficiency** — control did not achieve its objective in one or more instances
   - **Significant deficiency** — important enough to merit attention by those charged with governance
   - **Material weakness** — reasonable possibility that a material misstatement will not be prevented or detected timely

Reference AS 2201 (PCAOB) and SAB 108 guidance when sizing severity.

### 5. Issue write-up

If deficiency identified, generate an issue draft using the `issue-writeup` skill — pass control_id, severity, root cause, and quantification.

## Output

### Workpaper structure

```
SOX Control Test — {control_id} — {test_period}

## 1. Control summary
{control_id} | {owner} | {frequency} | {control_type}
Risk addressed: {risk}
Assertions: {assertions}

## 2. Scope and approach
Test type: {design | operating | both}
Period: {start_date} to {end_date}
Population: {n_items} {description}
Sample size: {n} | Methodology: {method} | Rationale: {why}

## 3. Sample testing matrix
| Ref | Date | Item | Auth | Exist | Accuracy | Complete | Timely | Notes |

## 4. Exception summary
{table of exceptions with severity}

## 5. Conclusion
Operating effectiveness: {effective | deficient}
Deficiency classification: {none | control | significant | material}
Recommended actions: {list}

## 6. Reviewer sign-off
Preparer: {name} {date}
Reviewer: {name} {date}
```

### Reviewer checklist
- [ ] Sample methodology documented and defensible
- [ ] All attributes mapped to procedures
- [ ] Exception evaluation references firm framework
- [ ] IPE reliance addressed (if applicable)
- [ ] ITGC dependency noted (if automated control)
- [ ] Conclusion supported by evidence

## Evals

This skill is evaluated against `evals/sox-control-testing/` — 15 golden control tests across preventive/detective and manual/automated categories. Promotion gate: 90% pass rate on procedure completeness, 100% on deficiency framework application.

## Citations and authority

Tests align to:
- PCAOB AS 2201 — An Audit of Internal Control Over Financial Reporting
- COSO 2013 Internal Control — Integrated Framework
- Firm Internal Audit Manual §4.3 — SOX Testing Methodology
