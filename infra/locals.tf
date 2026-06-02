locals {
  name_prefix          = var.project_name
  frontend_bucket_name = coalesce(var.frontend_bucket_name, "${local.name_prefix}-frontend")
  ecs_redis_host       = var.enable_elasticache ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : var.redis_host

  common_tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
}
