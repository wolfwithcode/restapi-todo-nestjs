#!/bin/bash

# Check if MinIO is running, if not start it
if ! docker ps | grep -q minio; then
  echo "Starting MinIO..."
  docker-compose -f docker-compose.minio.yml up -d
  sleep 5  # Give MinIO time to start
fi

# Set default values
ENTITY_TYPE=${1:-metadata}
ENTITY_ID=${2:-system}

# Output usage if help is requested
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
  echo "Usage: $0 [entity_type] [entity_id]"
  echo ""
  echo "Verifies ETag concurrency control for GS1 entities."
  echo ""
  echo "Entity types:"
  echo "  product   - Product data (requires product ID)"
  echo "  company   - Company data (requires company ID)"
  echo "  metadata  - System metadata (use 'system' as entity ID)"
  echo ""
  echo "Examples:"
  echo "  $0 product 01/12345678901234"
  echo "  $0 company 123456789"
  echo "  $0 metadata system"
  echo ""
  exit 0
fi

echo "Verifying ETag concurrency control for $ENTITY_TYPE/$ENTITY_ID..."
yarn ts-node src/cli.ts --gs1 verify-etag -t "$ENTITY_TYPE" -i "$ENTITY_ID"

# Check the exit status
if [ $? -eq 0 ]; then
  echo "✅ ETag concurrency control verification successful."
else
  echo "❌ ETag concurrency control verification failed."
  exit 1
fi 