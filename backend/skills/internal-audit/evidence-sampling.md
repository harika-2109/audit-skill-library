---
name: evidence-sampling
description: Draw a defensible audit sample from a population. Use when you need to size a sample for substantive or controls testing, document a sampling methodology, select items using attribute or variable sampling, or evaluate sample results and project to the population. Supports statistical and non-statistical approaches per AICPA AU-C 530.
argument-hint: "<population_source> [test_type]"
owner: internal-audit
category: testing
status: published
version: 1.1.0
sla_minutes: 30
---

# /evidence-sampling

> Connectors needed: SAP read-only, system reports, evidence repository for selected items. See [CONNECTORS.md](../../CONNECTORS.md).

Sizes, draws, and documents an audit sample with full statistical defensibility. Supports attribute sampling (controls testing), monetary unit sampling (substantive), and judgmental selection (small populations or high-risk items).

## Trigger

Auditor runs `/evidence-sampling`, or asks for sample size, sampling methodology, MUS selection, attribute sample, statistical sample, or stratified sample.

## Inputs

1. **Population source** — system, report, or extract describing the population
2. **Test type** — controls (attribute), substantive (MUS or variable), or fraud-focused (judgmental + high-risk filter)
3. **Population size** — `N`
4. **Population value** (substantive only) — total dollar value
5. **Risk parameters**:
   - Tolerable rate or tolerable misstatement
   - Expected rate or expected misstatement
   - Desired confidence level (default 95% for SOX key)

## Process

### 1. Method selection

| Test purpose | Method | When to use |
|---|---|---|
| Controls operating effectiveness | Attribute sampling | Pass/fail per item, want rate inference |
| Substantive — large $ population | Monetary Unit Sampling (MUS) | Items larger than tolerable misstatement |
| Substantive — variable population | Classical variable sampling | Item values vary widely, want $ projection |
| Small or high-risk population | Judgmental | <30 items, or specific risk-based selection |
| Fraud testing | Judgmental + filters | Outliers, round-dollar, weekend/holiday, dormant accounts |

### 2. Sample size — attribute (controls)

Use AICPA standard table:

| Tolerable rate | Expected rate 0% | 1% | 2% | 3% |
|---|---|---|---|---|
| 10% | 30 | 38 | 58 | 95 |
| 5% | 60 | 78 | 124 | 195 |
| 4% | 75 | 95 | 156 | infeasible — redesign test |

For frequency-based SOX testing, refer to `sox-control-testing` matrix instead.

### 3. Sample size — MUS

```
sample_size = ceil(population_value × reliability_factor / tolerable_misstatement)
reliability_factor at 95% confidence = 3.0 (zero expected errors)
```

Example: $50M population, $1M tolerable, 0 expected errors → 150 sampling units.

### 4. Selection mechanics

- **Random** — generate random numbers, document seed for reproducibility
- **Systematic** — interval = N / n, random start, document start point
- **Stratified** — split population by value bands, sample each stratum
- **MUS** — interval = population_value / n, select every nth dollar; items containing each selected dollar are in the sample (large items have higher selection probability)
- **Judgmental** — document selection criteria, justify why representative

### 5. Documentation requirements

For every sample, capture:
- Population definition (cutoff dates, exclusions, inclusions)
- Reconciliation of sample population to general ledger or source system
- Method, sample size, parameters
- Selection mechanism (with seed if random)
- Sample item references with full audit trail back to source
- Replacement policy if items are voided or unavailable

### 6. Results evaluation

**Attribute:**
- Compute upper deviation rate at confidence level
- Compare to tolerable rate
- If exceeds tolerable: control is not operating effectively; deficiency assessment required

**MUS:**
- For each error, compute tainting % = (book value - audit value) / book value
- Projected error = tainting × sampling interval (for items < interval) or actual error (for items ≥ interval)
- Sum projected errors + add basic precision (factor × interval) = upper misstatement bound
- Compare to tolerable misstatement

## Output

```
Sample Plan — {test_name}

## 1. Population
Source: {system, report, extract date}
Population size N: {count}
Population value: {if applicable}
Reconciliation: {tied to GL acct $xxx as of {date}}

## 2. Method and parameters
Method: {attribute | MUS | variable | judgmental}
Confidence: {95%}
Tolerable: {rate or $}
Expected: {rate or $}
Sample size n: {count}
Selection: {random | systematic | stratified | MUS | judgmental}

## 3. Selection
Seed: {if random}
Interval: {if systematic or MUS}
Selected items: {table or attached file with refs}

## 4. Results (post-testing)
| Ref | Tested | Result | Error |

Upper deviation rate / projected misstatement: {value}
Tolerable threshold: {value}
Conclusion: {acceptable | deficient}

## 5. Workpaper references
{evidence retained, file locations}
```

## Evals

Evaluated against `evals/evidence-sampling/` — 12 historical samples spanning attribute, MUS, and judgmental methods. Promotion gate: sample sizes match published methodology within tolerance; results evaluation correctly identifies deficient cases.

## Citations

- AICPA AU-C 530 — Audit Sampling
- PCAOB AS 2315 — Audit Sampling
- Firm Internal Audit Manual §4.5 — Sampling Methodology
