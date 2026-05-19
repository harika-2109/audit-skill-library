# Deployment Guide — AWS

## Prerequisites

- AWS CLI v2 authenticated to the target AWS account
- Terraform ≥ 1.6
- Docker (for building images locally) or a CI/CD pipeline that does it for you
- Existing VPC, private and public subnet IDs (your network team has these)
- Bedrock model access enabled in the target region for `anthropic.claude-sonnet-4-5-20250929-v1:0`

## One-time setup

### 1. Configure Terraform backend

Uncomment and edit the `backend "s3"` block in `infrastructure/terraform/main.tf` with your team's tfstate bucket and DynamoDB lock table. Talk to Cloud Platforms if you don't have one yet.

### 2. Set variables

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit with VPC ID, subnet IDs, cost center
```

### 3. Initialize and apply

```bash
terraform init
terraform plan -out=plan.tfplan
# Review the plan — should show ~25 resources for a fresh deploy
terraform apply plan.tfplan
```

Capture the outputs — especially `ecr_backend_url`, `ecr_frontend_url`, `app_url`.

## Build and push images

The first deploy will fail until the ECR repos have images. After `terraform apply` succeeds:

```bash
# Authenticate Docker to ECR
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# Build and push backend
TAG=$(git rev-parse --short HEAD)
BACKEND_URL=$(terraform -chdir=infrastructure/terraform output -raw ecr_backend_url)
docker build -t $BACKEND_URL:$TAG -t $BACKEND_URL:latest ./backend
docker push $BACKEND_URL:$TAG
docker push $BACKEND_URL:latest

# Build and push frontend
FRONTEND_URL=$(terraform -chdir=infrastructure/terraform output -raw ecr_frontend_url)
docker build -t $FRONTEND_URL:$TAG -t $FRONTEND_URL:latest ./frontend
docker push $FRONTEND_URL:$TAG
docker push $FRONTEND_URL:latest

# Force ECS to pull the new images
CLUSTER=$(terraform -chdir=infrastructure/terraform output -raw ecs_cluster_name)
aws ecs update-service --cluster $CLUSTER --service audit-skills-sit-backend --force-new-deployment
aws ecs update-service --cluster $CLUSTER --service audit-skills-sit-frontend --force-new-deployment
```

The `deploy_commands` Terraform output generates these commands for you with the correct values — `terraform output deploy_commands`.

## Verifying the deploy

```bash
APP_URL=$(terraform -chdir=infrastructure/terraform output -raw app_url)
curl $APP_URL/health                # backend health
curl $APP_URL/api/skills | jq       # should return 8 audit skills
open $APP_URL                       # browse the catalog
```

Watch the ECS services come healthy:

```bash
aws ecs describe-services --cluster $CLUSTER \
  --services audit-skills-sit-backend audit-skills-sit-frontend \
  --query 'services[].{name:serviceName,running:runningCount,desired:desiredCount,events:events[0].message}'
```

## CI/CD wire-up

The build commands above are designed to drop straight into a pipeline:

- **GitHub Actions** — push to `main` triggers OIDC auth to AWS, build, push, ECS update
- **Jenkins / Bamboo** — same commands inside a credentials-bound stage
- **AWS CodePipeline** — CodeBuild project per service, ECS deploy action

The two services are independently deployable. Backend can ship without frontend and vice versa — they communicate only over HTTP.

## Promoting between environments

The same Terraform configuration deploys to `dev`, `sit`, `uat`, `prod` based on the `environment` variable. Use separate tfvars files and tfstate keys:

```
infrastructure/terraform/
├── envs/
│   ├── sit.tfvars
│   ├── uat.tfvars
│   └── prod.tfvars
```

Promotion is image-tag based — the same image digest that passed SIT and UAT gets deployed to prod. Don't rebuild for prod.

## Rollback

ECS deployment circuit breaker is enabled with automatic rollback. If a new task definition fails health checks, ECS reverts to the previous one without intervention.

For manual rollback:

```bash
# List recent task definitions
aws ecs list-task-definitions --family-prefix audit-skills-sit-backend --sort DESC

# Update service to a previous revision
aws ecs update-service --cluster $CLUSTER --service audit-skills-sit-backend \
  --task-definition audit-skills-sit-backend:42
```

## Cost notes

For SIT/UAT defaults (2× backend Fargate 1024/2048, 2× frontend Fargate 512/1024, db.t4g.medium):
- ECS Fargate: ~$80/month
- RDS: ~$50/month
- ALB: ~$22/month
- NAT (if not shared): ~$30/month
- S3 / ECR / CloudWatch / Secrets: ~$10–20/month
- **Bedrock invocations are the variable cost.** Sonnet 4.5 is $3/MTok in, $15/MTok out. A typical skill execution is 5–15K tokens — pennies per run. Budget for $200–500/month at SIT volumes.

Prod with HA (Multi-AZ RDS, 3× tasks per service) roughly doubles infra; Bedrock scales with use.

## Compliance / audit prep

The deploy already includes:

- All S3 buckets encrypted, versioned, public-access-blocked
- RDS encrypted, automated backups, performance insights
- ECR images immutable, scan-on-push
- ALB drops invalid headers
- ECS tasks run as non-root, no public IPs
- Secrets in Secrets Manager, never in env files
- CloudWatch retention set
- All resources tagged with `Compliance: SR-11-7,SOX-404`

For an OCC/FRB exam talking point: the audit log records every authoring action — actor, action, resource, timestamp, before/after state — and the model code is in `backend/app/core/audit_log.py`. Today it writes JSONL; for prod swap the implementation to insert into RDS `audit_log` table (schema migration not yet applied — TODO before prod).
