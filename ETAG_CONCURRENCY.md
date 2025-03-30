# ETag-Based Concurrency Control for GS1 Identity Resolver

This document provides an overview of the ETag-based concurrency control implemented in the GS1 Identity Resolver system.

## What are ETags?

ETags (Entity Tags) are HTTP response headers used for web cache validation and for conditional requests to prevent the "lost update" problem. In S3/MinIO, ETags represent a hash of the object content and change whenever the object is modified.

## Why ETags instead of Custom Hash Files?

We've migrated from our previous approach of managing separate hash files to using the built-in ETags provided by S3/MinIO for several reasons:

1. **Simplicity**: Using native ETags eliminates the need for maintaining separate hash files.
2. **Efficiency**: No extra storage or computation costs associated with calculating and storing custom hashes.
3. **Native Integration**: S3/MinIO already provides ETags for all objects by default.
4. **Atomicity**: ETag verification is built into S3/MinIO's conditional operations, ensuring atomic updates.

## How ETag Concurrency Works

### Basic Flow

1. **Retrieve with ETag**: When retrieving a resource for update purposes, include the query parameter `?includeETag=true` to get the current ETag.
   ```
   GET /gs1/products/01/12345678901234?includeETag=true
   ```

2. **Submit with ETag**: When updating, include the original ETag in your request body:
   ```json
   {
     "name": "Updated Product",
     "_etag": "a1b2c3d4..."
   }
   ```

3. **Server Verification**: The server validates that the ETag matches before applying the update. If the ETags don't match, the update is rejected with a 409 Conflict response.

### Handling Conflicts

If you receive a 409 Conflict response, it means someone else has modified the resource since you retrieved it. To resolve this:

1. Retrieve the resource again to get the latest version and ETag.
2. Apply your changes to this latest version.
3. Submit the update with the new ETag.

## Implementation Details

- `MinioService` handles the low-level interactions with S3/MinIO, including ETag retrieval and conditional operations.
- `GS1StorageService` implements higher-level logic for managing GS1 entities with ETag concurrency control.
- `GS1ResolverService` provides a clean API that handles the business logic, including ETag verification.

## Testing ETag Concurrency

You can test ETag concurrency control using the provided tools:

### API Endpoints
```
GET /gs1/verify/{entityType}/{entityId}
```

### Command Line
```bash
# Using npm/yarn scripts
yarn gs1:verify:etag -t product -i 01/12345678901234

# Using the shell script
./verify-integrity.sh product 01/12345678901234
```

### API Client Example
We've included an example script showing how to use ETags in an API client:
```bash
# Run the example
./api-examples/etag-update-flow.sh

# Simulate a conflict
./api-examples/etag-update-flow.sh --simulate-conflict
```

## Benefits

- **Prevents Data Loss**: Ensures updates are based on the most recent version of the data.
- **Optimistic Concurrency**: Allows high throughput without locking, only rejecting conflicting updates.
- **Data Integrity**: Helps maintain consistency and integrity of your GS1 data.
- **Simplified Architecture**: Leverages native S3/MinIO capabilities without additional complexity. 