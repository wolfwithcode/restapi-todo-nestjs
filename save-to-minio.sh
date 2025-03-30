#!/bin/bash

# Start MinIO in the background
echo "Starting MinIO..."
docker compose -f docker-compose.minio.yml up -d

# Wait for MinIO to start
echo "Waiting for MinIO to start..."
sleep 5

# Save the sample data
echo "Saving sample data to MinIO..."
yarn save-sample

echo "Done!"
echo "The MinIO console is available at http://localhost:9001 (login with minioadmin/minioadmin)"
echo "The link resolver data is saved to the 'link-resolvers' bucket" 