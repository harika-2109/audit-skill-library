terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
  # Configure remote state in your environment:
  # backend "s3" {
  #   bucket         = "your-tfstate-bucket"
  #   key            = "audit-skills/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "your-tfstate-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "internal-audit-skill-library"
      Environment = var.environment
      Owner       = "Internal-Audit-Platform"
      CostCenter  = var.cost_center
      Compliance  = "SR-11-7,SOX-404"
      ManagedBy   = "Terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }

locals {
  name = "${var.project_name}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)
}
