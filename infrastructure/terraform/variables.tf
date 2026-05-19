variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, sit, uat, prod)"
  type        = string
  default     = "sit"
  validation {
    condition     = contains(["dev", "sit", "uat", "prod"], var.environment)
    error_message = "Environment must be dev, sit, uat, or prod."
  }
}

variable "project_name" {
  description = "Project name used as a prefix for resources"
  type        = string
  default     = "audit-skills"
}

variable "cost_center" {
  description = "Cost center tag"
  type        = string
  default     = "CC-0000"
}

# Networking — provide your existing VPC and subnet IDs
variable "vpc_id" {
  description = "VPC ID to deploy into (existing WF VPC)"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks and RDS"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the internal ALB"
  type        = list(string)
}

# Sizing
variable "backend_cpu" {
  description = "ECS task CPU for backend (256, 512, 1024, 2048)"
  type        = number
  default     = 1024
}

variable "backend_memory" {
  description = "ECS task memory (MB) for backend"
  type        = number
  default     = 2048
}

variable "frontend_cpu" {
  description = "ECS task CPU for frontend"
  type        = number
  default     = 512
}

variable "frontend_memory" {
  description = "ECS task memory (MB) for frontend"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Number of backend task instances"
  type        = number
  default     = 2
}

variable "frontend_desired_count" {
  description = "Number of frontend task instances"
  type        = number
  default     = 2
}

# RDS
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB"
  type        = number
  default     = 50
}

# LLM
variable "use_bedrock" {
  description = "Use Bedrock instead of direct Anthropic API (required for WF prod)"
  type        = bool
  default     = true
}

variable "anthropic_model" {
  description = "Claude model id"
  type        = string
  default     = "anthropic.claude-sonnet-4-5-20250929-v1:0"
}

# Optional certificate ARN for HTTPS listener on ALB
variable "alb_certificate_arn" {
  description = "ACM certificate ARN for ALB HTTPS listener (optional for non-prod)"
  type        = string
  default     = ""
}
