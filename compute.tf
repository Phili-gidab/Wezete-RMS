###############################################################################
# Wezete Restaurant Management System – Compute (EC2)
###############################################################################

# Ubuntu 24.04 LTS AMI (latest, HVM, SSD, amd64)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "wezete_backend" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.wezete_backend_sg.id]
  key_name               = var.ec2_key_name

  root_block_device {
    volume_size = 20
    volume_type = "gp2"
  }

  user_data = <<-USERDATA
    #!/bin/bash
    set -euo pipefail

    # System updates
    apt-get update -y
    apt-get upgrade -y

    # Install Docker
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable Docker service
    systemctl enable docker
    systemctl start docker

    # Add ubuntu user to docker group
    usermod -aG docker ubuntu

    # Install Docker Compose (standalone binary for backward compat)
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
    curl -fsSL "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    # Install and configure Nginx
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx

    # Create a basic Nginx reverse-proxy config placeholder
    cat > /etc/nginx/sites-available/wezete <<'NGINX'
    server {
        listen 80 default_server;
        server_name _;

        location / {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    NGINX

    ln -sf /etc/nginx/sites-available/wezete /etc/nginx/sites-enabled/wezete
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
  USERDATA

  tags = {
    Name = "${var.project_name}-backend"
  }
}

# --- Elastic IP ---
resource "aws_eip" "wezete_eip" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}

resource "aws_eip_association" "wezete_eip_assoc" {
  instance_id   = aws_instance.wezete_backend.id
  allocation_id = aws_eip.wezete_eip.id
}
