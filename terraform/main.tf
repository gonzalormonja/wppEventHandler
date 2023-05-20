variable "ssh_key_path" {}
variable "project_name" {}
variable "availability_zone" {}
variable "vpc_id" {}
variable "instance_type" {}
variable "region_name" {}
variable "github_token" {}

provider "aws" {
  region = var.region_name
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}


resource "aws_key_pair" "deployer-key" {
  key_name   = "${var.project_name}-deployer-key"
  public_key = file(var.ssh_key_path)
}

resource "aws_ebs_volume" "api" {
  availability_zone = var.availability_zone
  size              = 4
  type              = "gp3"
  encrypted         = true
  tags = {
    Name = "${var.project_name}-database-ebs"
  }
}

resource "aws_security_group" "allow_ssh" {
  vpc_id = var.vpc_id

  ingress {
    description = "SSH from VPC"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "allow_ssh"
  }
}

resource "aws_security_group" "allow_api" {
  name        = "allow_api"
  description = "allow port 3000"
  vpc_id      = var.vpc_id

  ingress {
    description = "Api from VPC"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "allow_api"
  }
}

// 16KB max file size
data "template_file" "userdata" {
  template = templatefile("${path.module}/userdata.sh", {
    github_token = var.github_token
  })
}

resource "aws_instance" "api" {
  ami               = data.aws_ami.ubuntu.id
  availability_zone = var.availability_zone
  instance_type     = var.instance_type
  vpc_security_group_ids = [
    aws_security_group.allow_ssh.id,
    aws_security_group.allow_api.id,
  ]
  user_data = data.template_file.userdata.rendered
  key_name  = aws_key_pair.deployer-key.key_name
  tags = {
    Name = "${var.project_name}-api-instance"
  }
}

resource "aws_eip" "eip" {
  instance = aws_instance.api.id
  vpc      = true
  tags = {
    Name = "${var.project_name}-api-epi"
  }
}

resource "aws_volume_attachment" "api" {
  device_name = "/dev/xvdc"
  volume_id   = aws_ebs_volume.api.id
  instance_id = aws_instance.api.id
}

output "instance_ip" {
  description = "The public ip for the instance"
  value       = aws_instance.api.public_ip
}
output "eip_ip" {
  description = "The eip ip for ssh access"
  value       = aws_eip.eip.public_ip
}

output "ssh" {
  value = "ssh -l ubuntu ${aws_eip.eip.public_ip}"
}
output "url" {
  value = "http://${aws_eip.eip.public_ip}/"
}

