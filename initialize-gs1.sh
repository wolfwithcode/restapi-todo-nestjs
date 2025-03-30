#!/bin/bash

# Start MinIO in the background using Docker Compose
echo "Starting MinIO..."
docker-compose -f docker-compose.minio.yml up -d

# Wait a moment for MinIO to fully initialize
echo "Waiting for MinIO to start..."
sleep 5

# Run the GS1 initialization command
echo "Initializing GS1 identity resolver with sample data..."
yarn ts-node src/cli.ts --gs1 initialize-gs1

echo ""
echo "GS1 Identity Resolver has been initialized!"
echo "You can access MinIO console at: http://localhost:9001"
echo "Login with: minioadmin / minioadmin"
echo "Check the gs1-identity-resolver bucket for your data"
echo ""
echo "To test the API, try these endpoints:"
echo "- http://localhost:3000/gs1/products/01/12345678901234"
echo "- http://localhost:3000/gs1/products/01/12345678901235/10/ABC123"
echo "- http://localhost:3000/gs1/01/12345678901234 (Digital Link)"
echo "" 