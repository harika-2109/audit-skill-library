"""AI-assisted skill scaffolding for Internal Audit.

The wizard collects 8 structured answers about the skill. This module sends
those answers to Claude with an audit-specific system prompt and returns a
draft SKILL.md the human will review and edit before saving.
"""
from __future__ import annotations

import json
import logging
import re

from anthropic import AsyncAnthropic
from app.core.config import settings
from app.models.skill import SkillScaffoldResponse, WizardIntake

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a senior author of Internal Audit skills (markdown procedures used by AI agents and auditors). Your job is to convert a structured intake form into a publication-ready SKILL.md draft for a regulated financial-services Internal Audit context.

You write like a deep audit expert:
- Concrete, testable procedures (not platitudes)
- Defensible methodology grounded in real standards (PCAOB AS, IIA Standards, COSO, AICPA AU-C)
- Cite real standard identifiers (e.g., "PCAOB AS 2201", "IIA Standard 2200", "COSO 2013 Principle 12")
- Do NOT invent citations you're not confident exist
- Specific enough that a competent auditor with no prior context could follow it
- No fluff, no hedging language

Structure every audit SKILL.md as follows (markdown headings exactly as shown):

```
# /skill-name

> Connectors needed: list of systems / data sources (RCM, SAP, GRC system, evidence repo, etc.)

Brief paragraph (2–4 sentences) describing what the skill produces and the value it delivers.

## Trigger

When an auditor would invoke this — keywords, situations, related questions an auditor might ask.

## Inputs

Gather the following. If not provided, ask before proceeding:

1. **Input name** — what it is, why it's needed
2. **Input name** — what it is, why it's needed
...

## Process

### 1. First step name
What to do, what authoritative method to apply, what to capture.

### 2. Second step name
...

(typically 3–6 numbered steps with clear authoritative actions)

## Output

```
Structured template (in a code block) showing the exact shape of the deliverable —
workpaper sections, issue fields, report structure, etc.
```

## Evals

How the skill will be evaluated. Specify a `evals/{skill-name}/` directory, the
number of golden test cases, the promotion gate threshold, and what good output
looks like.

## Citations

- Standards that apply (PCAOB, IIA, COSO, AICPA)
- Internal policy references (firm Internal Audit Manual sections)
```

Return ONLY a valid JSON object with this exact shape:

{
  "name": "kebab-case-skill-name",
  "description": "Action-first description in 80-300 chars. Use when… Produces…",
  "argument_hint": "<arg1> [optional_arg2]" or null,
  "body": "the full SKILL.md body (no frontmatter, starts with # /name)",
  "notes": ["one-line note about something the human should review", "..."]
}

Rules:
- name: 2–80 chars, lowercase letters/digits/hyphens only, descriptive
- description: 80–300 chars; agent reads this to decide when to invoke the skill
- argument_hint: shell-style hint like "<control_id> [period]" or null if no args
- body: markdown, 500–3000 words, follows the structural template exactly
- notes: 2–5 short flags for the human reviewer — placeholders, assumptions you made, judgment calls, citations to verify

Do not wrap the JSON in markdown fences. Do not add commentary before or after.
"""


def _build_user_prompt(intake: WizardIntake) -> str:
    return f"""Build a SKILL.md from this intake form.

Skill summary: {intake.summary}

Category: {intake.category.value}

When should an auditor invoke this skill?
{intake.trigger}

What inputs does the skill require?
{intake.inputs}

Systems / data sources / connectors needed:
{intake.connectors or "(not specified — infer from context)"}

What output does the skill produce?
{intake.output}

Authoritative standards that apply:
{intake.standards or "(not specified — pick the standard audit standards that fit: PCAOB AS for SOX, IIA Standards for audit methodology, COSO for controls, AICPA AU-C for sampling/evidence)"}

Estimated time: {f"{intake.sla_minutes} minutes" if intake.sla_minutes else "not specified"}

Suggested name: {intake.suggested_name or "(pick a descriptive kebab-case name)"}

Produce the JSON draft now."""


def _client() -> AsyncAnthropic:
    if settings.use_bedrock:
        from anthropic import AsyncAnthropicBedrock
        return AsyncAnthropicBedrock(aws_region=settings.aws_region)
    return AsyncAnthropic(api_key=settings.anthropic_api_key)


def _extract_json(text: str) -> dict:
    """Robustly pull a JSON object out of the model's response."""
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # Strip markdown fences if model added them
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Last resort: find the first balanced { ... }
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in model response")
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("Unbalanced JSON in model response")


async def scaffold_skill(intake: WizardIntake) -> SkillScaffoldResponse:
    """Ask Claude to draft a SKILL.md from the wizard intake."""
    client = _client()
    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_user_prompt(intake)}],
    )
    raw = response.content[0].text if response.content else ""
    logger.info("scaffold response %d chars", len(raw))

    data = _extract_json(raw)

    # Light validation — let pydantic do the rest
    name = data.get("name", "").strip()
    if not re.match(r"^[a-z0-9-]{2,80}$", name):
        fallback = re.sub(
            r"[^a-z0-9-]",
            "-",
            (intake.suggested_name or intake.summary[:40]).lower(),
        )
        fallback = re.sub(r"-+", "-", fallback).strip("-")
        name = fallback or "new-skill"

    return SkillScaffoldResponse(
        name=name,
        description=data.get("description", ""),
        argument_hint=data.get("argument_hint"),
        body=data.get("body", ""),
        notes=data.get("notes", []) or [],
    )
