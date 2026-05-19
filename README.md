# Internal Audit Skill Library

A production-grade skill library and chat platform for Internal Audit. Skills are authored as markdown files with YAML frontmatter — the same format as the Anthropic Agent SDK — so anything published here is portable to any MCP/agent runtime without rewriting.

Ships with 8 production-ready audit skills and an 8-question wizard for creating new ones with Claude's help.

## What's in the box

```
audit-skill-library/
├── backend/                          FastAPI service
│   ├── app/
│   │   ├── api/                      skills, chat, scaffold (wizard)
│   │   ├── services/                 skill_repo, llm_client, skill_scaffold
│   │   └── models/skill.py           Data models (audit-only)
│   ├── skills/internal-audit/        8 production-ready audit skills
│   ├── tests/                        16 tests, all passing
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                         Next.js 15 app
│   ├── src/app/
│   │   ├── page.tsx                  Catalog (grouped by category)
│   │   ├── skills/[name]/            Skill detail page
│   │   ├── skills/wizard/            8-question wizard with AI generation
│   │   └── chat/                     Streaming chat
│   ├── Dockerfile
│   └── package.json
├── infrastructure/terraform/         AWS deployment (ECS Fargate, ALB, RDS, S3, ECR)
├── docs/
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
├── docker-compose.yml
└── .env.example
```

## The 8 audit skills shipped by default

| Skill | Category | What it does |
|---|---|---|
| `audit-planning` | Planning | Build an engagement plan from objectives to timeline |
| `risk-assessment` | Planning | Score inherent and residual risk for an RAU |
| `rcm-walkthrough` | Documentation | Convert walkthrough notes into a structured RCM |
| `sox-control-testing` | SOX | End-to-end SOX 404 control test workpaper |
| `evidence-sampling` | Testing | Statistically defensible audit sample (attribute, MUS, judgmental) |
| `issue-writeup` | Reporting | 5C-framework issue writeup with root cause and severity |
| `regulatory-mapping` | Regulatory | Map a regulation to controls, identify gaps |
| `continuous-controls-monitoring` | Monitoring | Design a CCM routine for a key control |

## The wizard

`/skills/wizard` asks 8 audit-specific questions, then has Claude draft the SKILL.md from those structured answers:

1. **What does this skill do?** — One-sentence summary
2. **Which audit category?** — Planning, Documentation, SOX, Testing, Reporting, Regulatory, Monitoring
3. **When should an auditor invoke this skill?** — The trigger conditions and keywords
4. **What inputs does the skill require?** — Numbered list of required inputs
5. **What systems or data sources does it touch?** — Connectors (RCM, SAP, GRC, evidence repo) *(optional)*
6. **What does the skill produce?** — Output deliverable
7. **Which authoritative standards apply?** — PCAOB AS, IIA, COSO, AICPA, firm manual *(optional)*
8. **Final details** — Time estimate and suggested name *(optional)*

After you click **"Generate skill with Claude →"**, Claude scaffolds a complete SKILL.md following the audit structural template (Trigger / Inputs / Process / Output / Evals / Citations), shows you "Things to review" notes flagging placeholders and judgment calls, and lets you edit anything with live markdown preview before saving.

Saved skills start in `draft` status and require SME review and approval to publish. Auto-saves to `localStorage` between questions so you don't lose work.

## Quick start — local

### Option A: Docker Compose

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY for local dev
docker compose up --build
```

App at `http://localhost:3000`, API at `http://localhost:8000`.

### Option B: Run services directly

**Backend:**
```bash
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`.

## What you'll see

1. **Catalog** (`/`) — All audit skills grouped by category. Search bar. "Create new skill" → wizard. "Open chat".
2. **Skill detail** (`/skills/{name}`) — Category badge, description, rendered SKILL.md (frontmatter + body), Edit and Delete buttons. "Run skill in chat" jumps to chat with that skill loaded.
3. **Wizard** (`/skills/wizard`) — 8-question intake with AI generation, review, and save.
4. **Chat** (`/chat`) — Streaming chat with Claude, optionally grounded in a specific skill.

## Tests

```bash
cd backend
PYTHONPATH=. pytest tests/ -v
```

All 16 tests pass:
- **11 skill tests**: health, listing, categories meta, get, filter, search, create with/without SLA, duplicate-rejection, invalid-category rejection, 404
- **5 wizard tests**: scaffold happy path, short-summary validation, invalid-category rejection, minimum-required-fields, no-domain enforcement

## Deploy to AWS

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Quick version:

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in your VPC, subnet IDs, cost center, etc.
terraform init && terraform apply
# Then build/push images per docs/DEPLOYMENT.md
```

`terraform output deploy_commands` prints the exact docker build/push/ECS-update commands.

## Architecture summary

Three layers:

- **Execute** — Claude (via Bedrock in prod, Anthropic API in dev) reads skill bodies as authoritative procedure
- **Ingest** — FastAPI authoring/CRUD with audit log on every state transition; skills written as markdown to filesystem (S3-mounted in prod)
- **Realize** — Next.js 15 catalog, skill detail, wizard, streaming chat

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the detailed picture.

## Why this shape

Two deliberate choices worth flagging:

1. **Skills are markdown files, not a database schema.** Same format as Anthropic Agent SDK. Portable to any MCP runtime without rewriting.
2. **Bedrock-first in prod.** The Anthropic API path is dev-only. Bedrock keeps inference inside your own AWS account — the realistic posture for regulated IA workloads.

## Compliance posture

- All authoring actions written to audit log with actor, action, resource, timestamp, metadata
- S3 buckets encrypted at rest, versioned, public access blocked
- RDS encrypted at rest, multi-AZ in prod, deletion protection in prod
- ECR images immutable with scan-on-push
- ALB internal-only, drops invalid headers, TLS 1.3
- ECS task role grants least-privilege (specific S3 paths, specific Bedrock model)
- Secrets Manager for DB credentials and Anthropic key (non-prod)
- CloudWatch log retention 90 days in prod, 30 in non-prod

## Not in v1 (deferred — call when needed)

- SSO / SAML wiring (placeholder header `X-User` for now; replace with Cognito, Okta, Azure AD, or enterprise SSO middleware)
- pgvector for RAG over evidence corpus
- Eval harness as a deployment gate (skeleton in skill frontmatter; runner not yet built)
- Approval workflow state machine UI (model supports draft → in_review → published, but the review screen is not yet exposed)
- WAF / Shield on ALB

## Contact

Owner: your team.
