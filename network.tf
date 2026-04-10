###############################################################################
# Wezete Restaurant Management System – Networking
###############################################################################

# --- VPC ---
resource "aws_vpc" "wezete_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# --- Internet Gateway ---
resource "aws_internet_gateway" "wezete_igw" {
  vpc_id = aws_vpc.wezete_vpc.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

###############################################################################
# Subnets
###############################################################################

data "aws_availability_zones" "available" {
  state = "available"
}

# Public Subnet – hosts the EC2 backend server
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.wezete_vpc.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

# Private Subnet A – RDS (AZ-a)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.wezete_vpc.id
  cidr_block        = var.private_subnet_a_cidr
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "${var.project_name}-private-subnet-a"
  }
}

# Private Subnet B – RDS (AZ-b, required for DB Subnet Group)
resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.wezete_vpc.id
  cidr_block        = var.private_subnet_b_cidr
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "${var.project_name}-private-subnet-b"
  }
}

###############################################################################
# Route Tables
###############################################################################

# Public route table – routes internet traffic through IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.wezete_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.wezete_igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Private route table – no internet route (isolated)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.wezete_vpc.id

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

###############################################################################
# Security Groups
###############################################################################

# Backend SG – allows SSH, HTTP, HTTPS from the internet
resource "aws_security_group" "wezete_backend_sg" {
  name        = "${var.project_name}-backend-sg"
  description = "Allow SSH, HTTP, and HTTPS inbound to Wezete backend"
  vpc_id      = aws_vpc.wezete_vpc.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-backend-sg"
  }
}

# Database SG – allows PostgreSQL ONLY from the backend SG
resource "aws_security_group" "wezete_db_sg" {
  name        = "${var.project_name}-db-sg"
  description = "Allow PostgreSQL access only from the backend security group"
  vpc_id      = aws_vpc.wezete_vpc.id

  ingress {
    description     = "PostgreSQL from backend"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.wezete_backend_sg.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-db-sg"
  }
}
