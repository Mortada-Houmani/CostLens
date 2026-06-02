# General
variable "project_name" {
  description = "Name used to prefix AWS resources."
  type        = string
  default     = "costlens"
}

variable "aws_region" {
  description = "AWS region where infrastructure will be created."
  type        = string
  default     = "eu-central-1"
}

# Network
variable "vpc_cidr" {
  description = "CIDR block for the CostLens VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the two public subnets."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "Provide at least two public subnet CIDR blocks."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the two private subnets."
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "Provide at least two private subnet CIDR blocks."
  }
}

# Backend
variable "backend_image" {
  description = "Backend container image URI to deploy to ECS."
  type        = string
}

variable "node_env" {
  description = "NODE_ENV value for the backend container."
  type        = string
  default     = "production"
}

variable "backend_port" {
  description = "Port exposed by the backend container."
  type        = number
  default     = 3000
}

variable "backend_cpu" {
  description = "CPU units for the backend Fargate task."
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Memory in MiB for the backend Fargate task."
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of backend ECS tasks."
  type        = number
  default     = 1
}

variable "database_url" {
  description = "Neon PostgreSQL connection URL for the backend."
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Secret key used by the backend to encrypt stored AWS secret access keys."
  type        = string
  sensitive   = true
}

variable "app_access_token" {
  description = "Shared access token required by the backend API."
  type        = string
  sensitive   = true
}

# Redis
variable "redis_host" {
  description = "Redis host used by the backend when enable_elasticache is false."
  type        = string
  default     = "localhost"
}

variable "redis_port" {
  description = "Redis port used by the backend."
  type        = number
  default     = 6379
}

variable "enable_elasticache" {
  description = "Create a private ElastiCache Redis replication group for production."
  type        = bool
  default     = false
}

variable "elasticache_node_type" {
  description = "Node type for the optional ElastiCache Redis replication group."
  type        = string
  default     = "cache.t4g.micro"
}

# Frontend
variable "frontend_bucket_name" {
  description = "Name of the S3 bucket used for frontend static files. Defaults to project_name-frontend."
  type        = string
  default     = null
}
