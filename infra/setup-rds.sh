#!/usr/bin/env bash
# infra/setup-rds.sh
# Run once to create the RDS instance and apply the initial migration.
# Prerequisites: AWS CLI configured, jq installed.
# Usage: ./infra/setup-rds.sh

set -euo pipefail

DB_INSTANCE_ID="property-mgmt-db"
DB_NAME="propertydb"
DB_USER="propertyapp"
REGION="ap-southeast-1"

echo "→ Creating RDS PostgreSQL instance..."
aws rds create-db-instance \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version "15.17" \
  --master-username "$DB_USER" \
  --master-user-password "${DB_PASSWORD:?Set DB_PASSWORD env var}" \
  --db-name "$DB_NAME" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-multi-az \
  --publicly-accessible \
  --region "$REGION"

echo "→ Waiting for RDS to become available (this takes ~5 minutes)..."
aws rds wait db-instance-available \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION"

ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION" \
  --query "DBInstances[0].Endpoint.Address" \
  --output text)

echo "→ RDS endpoint: $ENDPOINT"
echo "→ Applying initial migration..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$ENDPOINT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f db/migrations/001_initial_schema.sql

echo ""
echo "Done. Add this to your .env (and your EC2 environment):"
echo "ConnectionStrings__Default=Host=$ENDPOINT;Port=5432;Database=$DB_NAME;Username=$DB_USER;Password=<your-password>"
