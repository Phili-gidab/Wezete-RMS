###############################################################################
# Green Mark Restaurant Management System – Main Configuration
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "yazol-coffee"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

###############################################################################
# Outputs
###############################################################################

output "ec2_elastic_ip" {
  description = "Elastic IP attached to the Green Mark backend EC2 instance"
  value       = aws_eip.greenmark_eip.public_ip
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = aws_db_instance.greenmark_db.endpoint
}
