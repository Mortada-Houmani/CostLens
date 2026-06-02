resource "aws_elasticache_subnet_group" "redis" {
  count = var.enable_elasticache ? 1 : 0

  name       = "${local.name_prefix}-redis-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-subnets"
  })
}

resource "aws_elasticache_replication_group" "redis" {
  count = var.enable_elasticache ? 1 : 0

  replication_group_id = "${local.name_prefix}-redis"
  description          = "CostLens Redis replication group"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.elasticache_node_type
  num_cache_clusters   = 1
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis[0].name
  security_group_ids   = [aws_security_group.redis[0].id]
  parameter_group_name = "default.redis7"

  automatic_failover_enabled = false
  at_rest_encryption_enabled = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })
}
