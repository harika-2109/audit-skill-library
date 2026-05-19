output "app_url" {
  description = "URL to access the application (internal)"
  value       = var.alb_certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
}

output "alb_dns_name" {
  description = "ALB DNS name — use this for Route53 CNAME"
  value       = aws_lb.main.dns_name
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "skills_bucket" {
  description = "S3 bucket for skill registry"
  value       = aws_s3_bucket.skills.id
}

output "evidence_bucket" {
  description = "S3 bucket for audit evidence"
  value       = aws_s3_bucket.evidence.id
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for DB credentials"
  value       = aws_secretsmanager_secret.db.arn
}

output "ecs_cluster_name" {
  description = "ECS cluster name (for force-new-deployment commands)"
  value       = aws_ecs_cluster.main.name
}

output "deploy_commands" {
  description = "Sample push and deploy commands"
  value = <<-EOT
    # Authenticate Docker to ECR
    aws ecr get-login-password --region ${var.aws_region} | \
      docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com

    # Build, tag, push backend
    docker build -t ${aws_ecr_repository.backend.repository_url}:$(git rev-parse --short HEAD) ./backend
    docker push ${aws_ecr_repository.backend.repository_url}:$(git rev-parse --short HEAD)

    # Build, tag, push frontend
    docker build -t ${aws_ecr_repository.frontend.repository_url}:$(git rev-parse --short HEAD) ./frontend
    docker push ${aws_ecr_repository.frontend.repository_url}:$(git rev-parse --short HEAD)

    # Force ECS to pull the new images
    aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.backend.name} --force-new-deployment
    aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.frontend.name} --force-new-deployment
  EOT
}
