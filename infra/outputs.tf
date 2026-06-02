output "vpc_id" {
  description = "ID of the CostLens VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets."
  value       = aws_subnet.private[*].id
}

output "backend_alb_dns_name" {
  description = "DNS name of the backend application load balancer."
  value       = aws_lb.backend.dns_name
}

output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository."
  value       = aws_ecr_repository.backend.repository_url
}

output "redis_endpoint" {
  description = "Endpoint for the optional ElastiCache Redis replication group."
  value       = var.enable_elasticache ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : null
}

output "frontend_bucket_name" {
  description = "Name of the S3 bucket that stores frontend static files."
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "ID of the frontend CloudFront distribution."
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the frontend CloudFront distribution."
  value       = aws_cloudfront_distribution.frontend.domain_name
}
