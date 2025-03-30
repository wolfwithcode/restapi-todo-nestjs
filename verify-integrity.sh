#!/bin/bash

# Verify data integrity of GS1 entities

# Check if MinIO is running
if ! docker ps | grep -q minio; then
  echo "MinIO container is not running. Starting MinIO..."
  docker-compose -f docker-compose.minio.yml up -d
  
  # Wait for MinIO to start
  echo "Waiting for MinIO to start..."
  sleep 5
fi

# Determine the entity type and ID
if [ "$1" == "" ] || [ "$2" == "" ]; then
  echo "Usage: $0 <entity_type> <entity_id>"
  echo "Entity types: product, company, metadata"
  echo "Examples:"
  echo "  $0 product 01/12345678901234"
  echo "  $0 company company-12345"
  echo "  $0 metadata system"
  
  # If no parameters, verify system metadata by default
  ENTITY_TYPE="metadata"
  ENTITY_ID="system"
  echo ""
  echo "No parameters provided. Defaulting to system metadata verification."
else
  ENTITY_TYPE="$1"
  ENTITY_ID="$2"
fi

echo ""
echo "Verifying data integrity of $ENTITY_TYPE with ID: $ENTITY_ID"
yarn ts-node src/cli.ts --gs1 verify-integrity -t "$ENTITY_TYPE" -i "$ENTITY_ID" 