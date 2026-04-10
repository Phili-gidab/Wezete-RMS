###############################################################################
# Wezete Restaurant Management System – Database (RDS PostgreSQL)
###############################################################################

# DB Subnet Group – spans both private subnets (required by RDS)
resource "aws_db_subnet_group" "wezete_db_subnet_group" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "wezete_db" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.wezete_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.wezete_db_sg.id]

  multi_az            = false
  publicly_accessible = false
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-db-final-snapshot"

  # Prevent accidental deletion
  deletion_protection = true

  backup_retention_period = 7

  tags = {
    Name = "${var.project_name}-db"
  }
}
