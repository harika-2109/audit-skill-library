# Architecture

## Three-layer model

The platform is structured as three layers that map to your ITNB Ingest → Execute → Realize spine. The choice is deliberate: it lets you reuse the runtime you already have (Claude Agent SDK + `itv-mcp` hub) and avoid rebuilding what's already approved.

```
┌──────────────────────────────────────────────────────────────────┐
│ Realize — catalog and chat (Next.js, what auditors see)          │
│  Catalog ── Skill detail ── Authoring form ── Streaming chat     │
└────────────────────────────────────────────────────────────────┬─┘
                                                                  │ reads/writes
┌──────────────────────────────────────────────────────────────────┐
│ Ingest — authoring and governance (FastAPI)                      │
│  CRUD ── Approval state machine ── Audit log ── (Eval harness)   │
└────────────────────────────────────────────────────────────────┬─┘
                                                                  │ skill bodies
┌──────────────────────────────────────────────────────────────────┐
│ Execute — runtime (Claude via Bedrock + itv-mcp hub)             │
│  Agent SDK loads SKILL.md ── Tools via MCP ── Streaming response │
└──────────────────────────────────────────────────────────────────┘
```

## Skill format

Each skill is a markdown file with YAML frontmatter, same as Anthropic Agent SDK and EFT Workbench:

```markdown
---
name: sox-control-testing
description: Run a SOX control test from RCM to workpaper. Use when…
argument-hint: "<control_id> [test_period]"
category: sox
status: published
version: 1.4.0
sla_minutes: 45
---

# /sox-control-testing

> Connectors needed: RCM, evidence repository, SAP read-only

Body in markdown — Trigger, Inputs, Process, Output, Evals, Citations.
```

**Why this format:**
- Progressive disclosure — agent loads only frontmatter per turn, body loads on invocation
- Source of truth is a file, not a schema. Git-able, diff-able, reviewable as code.
- Portable. The same file works in EFT Workbench, the `itv-mcp` hub, the Anthropic Agent SDK, or any future runtime.

## Backend (FastAPI)

```
app/
├── api/
│   ├── skills.py        # GET / POST / PATCH / DELETE /api/skills
│   └── chat.py          # POST /api/chat (SSE streaming)
├── core/
│   ├── config.py        # Pydantic settings (env-driven)
│   └── audit_log.py     # JSONL writer; replace with RDS insert in prod
├── models/
│   └── skill.py         # Pydantic models matching the file format
├── services/
│   ├── skill_repo.py    # Filesystem-backed CRUD + YAML parsing
│   └── llm_client.py    # Async Anthropic SDK; AnthropicBedrock when use_bedrock=true
└── main.py
```

Storage decision: **filesystem in v1, S3-mounted in prod.** When you move to AWS, the same code reads from a path that happens to be backed by EFS or an init-container syncing from S3. No model change.

## Frontend (Next.js 15, App Router)

```
src/app/
├── page.tsx                # Catalog — server component, lists skills by category
├── skills/[name]/page.tsx  # Skill detail — server component, renders frontmatter + markdown
├── skills/new/page.tsx     # Create form — client component, posts to /api/skills
├── chat/page.tsx           # Streaming chat — client component, reads /api/chat SSE
└── layout.tsx              # Header, footer, global styles
```

API calls go through Next.js rewrites in `next.config.js`, so the frontend never needs CORS in production — same origin.

## AWS topology

```
                  Enterprise VPC
  ┌────────────────────────────────────────────────────┐
  │   ┌──────────────────┐                              │
  │   │ Internal ALB     │ ◀── private DNS (Route53)    │
  │   │  TLS 1.3         │                              │
  │   └────┬─────────┬───┘                              │
  │        │ /api/*  │ /                                │
  │        ▼         ▼                                  │
  │   ┌────────┐ ┌────────┐                             │
  │   │Backend │ │Frontend│   ECS Fargate              │
  │   │tasks×N │ │tasks×N │   awsvpc, private subnets  │
  │   └───┬────┘ └────────┘                             │
  │       │                                             │
  │       ├──▶ RDS Postgres (Multi-AZ in prod)          │
  │       ├──▶ S3 (skills, evidence — versioned, KMS)   │
  │       ├──▶ Secrets Manager (DB creds, API keys)     │
  │       └──▶ Bedrock — invokeModelWithResponseStream  │
  │             (Claude Sonnet 4.5)                     │
  │                                                     │
  │   CloudWatch Logs (30/90 day retention)             │
  │   ECR (immutable, scan-on-push)                     │
  └────────────────────────────────────────────────────┘
```

## What's deliberately not here

- **No Cognito.** Enterprise SSO is typically the auth path. The frontend reads `X-User` from an upstream proxy header — wire that to your SSO IdP at the ALB or sidecar.
- **No pgvector.** Skills are markdown procedures, not a vector retrieval problem. Add a vector store when you have a corpus to retrieve over (evidence, policy library, prior workpapers).
- **No EKS.** ECS Fargate handles the load with no cluster management. Move to EKS only if you outgrow Fargate's task density limits, which is far off.
- **No LangGraph.** The chat is single-agent with skill body as system prompt. Multi-agent orchestration is a Flow AI concern, not this app's concern.

## What gets added next, in order

1. **Approval workflow** — `draft → in_review → published` state machine with UI for SME review queue. Backend model already supports the states.
2. **Eval harness** — every skill has an `evals/` folder; promotion to `published` blocks if eval pass rate < threshold. This is the NFR-as-gate story from Everest applied to every skill.
3. **`itv-mcp` integration** — register audit-specific MCP tools (evidence retrieval, control library lookup, sampling). The agent then has real tool surface, not just procedure.
4. **SSO** — drop the placeholder, integrate your enterprise SSO middleware. Frontend already passes user context via `X-User` header.
