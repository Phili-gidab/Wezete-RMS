###############################################################################
# Green Mark Restaurant Management System – Variables
###############################################################################

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project identifier used for naming/tagging"
  type        = string
  default     = "greenmark"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet (EC2)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_a_cidr" {
  description = "CIDR block for private subnet A (RDS)"
  type        = string
  default     = "10.0.10.0/24"
}

variable "private_subnet_b_cidr" {
  description = "CIDR block for private subnet B (RDS)"
  type        = string
  default     = "10.0.20.0/24"
}

variable "db_username" {
  description = "Master username for the RDS PostgreSQL instance"
  type        = string
  default     = "greenmark_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Master password for the RDS PostgreSQL instance"
  type        = string
  default     = "GreenMarkDB2026Secure!"
  sensitive   = true
}

variable "db_name" {
  description = "Name of the default database"
  type        = string
  default     = "greenmark_db"
}

variable "ec2_instance_type" {
  description = "EC2 instance type (Free Tier eligible)"
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS instance class (Free Tier eligible)"
  type        = string
  default     = "db.t3.micro"
}

variable "ec2_key_name" {
  description = "Name of an existing EC2 Key Pair for SSH access"
  type        = string
  default     = "greenmark-key"
}
