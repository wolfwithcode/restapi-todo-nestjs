#!/bin/bash

# Example script showing how to use ETags for optimistic concurrency control
# when updating resources in the GS1 Identity Resolver

API_URL="http://localhost:3000/gs1"
PRODUCT_ID="01/12345678901234"

echo "GS1 Identity Resolver API - ETag Concurrency Control Example"
echo "==========================================================="
echo

# Step 1: Get the product with ETag
echo "Step 1: Retrieving product with ETag..."
PRODUCT_INFO=$(curl -s "${API_URL}/products/${PRODUCT_ID}?includeETag=true")
echo "Product retrieved:"
echo "$PRODUCT_INFO" | python -m json.tool
echo

# Extract the ETag from the product information
ETAG=$(echo "$PRODUCT_INFO" | grep -o '"_etag":"[^"]*"' | sed 's/"_etag":"//;s/"//')
echo "ETag extracted: $ETAG"
echo

# Simulate another client modifying the product
simulate_concurrent_update() {
  echo "Simulating concurrent update by another client..."
  
  # Create a temporary product data file with a different description
  cat > /tmp/concurrent_update.json <<EOF
{
  "name": "Product modified by other client",
  "description": "This change was made by a different client"
}
EOF
  
  # Make the concurrent update
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @/tmp/concurrent_update.json \
    "${API_URL}/products/${PRODUCT_ID}" > /dev/null
    
  rm /tmp/concurrent_update.json
  
  echo "Concurrent update completed."
  echo
}

# Step 2: Try to update with valid ETag
echo "Step 2: Updating product with ETag..."

# Create a temporary product data file
cat > /tmp/product_update.json <<EOF
{
  "name": "Updated Product Name",
  "description": "This is an updated description with ETag validation",
  "_etag": "$ETAG"
}
EOF

# Simulate concurrent update if requested
if [ "$1" == "--simulate-conflict" ]; then
  simulate_concurrent_update
fi

# Make the update request
UPDATE_RESULT=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d @/tmp/product_update.json \
  "${API_URL}/products/${PRODUCT_ID}")

rm /tmp/product_update.json

# Check if the update succeeded or failed due to ETag mismatch
if echo "$UPDATE_RESULT" | grep -q "Concurrency conflict"; then
  echo "❌ Update FAILED due to ETag mismatch (concurrent modification detected)"
  echo "Error message:"
  echo "$UPDATE_RESULT" | python -m json.tool
  echo
  echo "To resolve this conflict:"
  echo "1. Get the latest version of the resource with a fresh ETag"
  echo "2. Apply your changes to this latest version"
  echo "3. Submit the update with the new ETag"
else
  echo "✅ Update SUCCEEDED - No conflicts detected"
  echo "Updated product:"
  echo "$UPDATE_RESULT" | python -m json.tool
fi

echo
echo "To simulate a conflict, run this script with the --simulate-conflict parameter:"
echo "  $0 --simulate-conflict" 