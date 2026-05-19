# ---------------------------------------------------------------------
# RDS — Postgres for skill metadata, audit log, eval results
# (Skill bodies live on S3; this is the registry layer.)
# ---------------------------------------------------------------------
resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db" {
  name        = "${local.name}-db-credentials"
  description = "RDS credentials for audit skills app"
  # KMS encryption with the default aws/secretsmanager key
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = "auditskills"
    password = random_password.db.result
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = "auditskills"
  })
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "main" {
  identifier             = "${local.name}-db"
  engine                 = "postgres"
  engine_version         = "16.4"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  storage_encrypted      = true
  storage_type           = "gp3"
  db_name                = "auditskills"
  username               = "auditskills"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period   = var.environment == "prod" ? 30 : 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "Sun:04:30-Sun:05:30"
  multi_az                  = var.environment == "prod"
  deletion_protection       = var.environment == "prod"
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${local.name}-final-${formatdate("YYYYMMDDhhmmss", timestamp())}" : null

  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  lifecycle {
    ignore_changes = [final_snapshot_identifier, password]
  }
}

# ---------------------------------------------------------------------
# Anthropic API key (only used if USE_BEDROCK=false — dev/sit only)
# ---------------------------------------------------------------------
resource "aws_secretsmanager_secret" "anthropic" {
  count       = var.use_bedrock ? 0 : 1
  name        = "${local.name}-anthropic-key"
  description = "Anthropic API key for audit skills (non-prod only)"
}
