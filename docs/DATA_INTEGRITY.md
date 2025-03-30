# GS1 Identity Resolver Data Integrity

The GS1 Identity Resolver uses AWS S3/MinIO for storage. Since these storage systems don't provide strong consistency guarantees for all operations, we've implemented additional mechanisms to ensure data integrity and handle concurrent modifications.

## ETag-Based Optimistic Concurrency Control

Our system uses the built-in ETag feature of S3/MinIO to provide optimistic concurrency control:

1. **ETags for File Versioning**: Every object in S3/MinIO has an ETag that changes whenever the object is updated. We leverage this to detect concurrent modifications.

2. **Conditional Operations**: When updating data, we include the original ETag to ensure that the object hasn't been modified by another process since it was retrieved.

3. **Optimistic Locking**: If the ETags don't match during an update, the operation fails, and the client must retrieve the latest version and try again.

4. **Immutable History Records**: All changes to product data are recorded in immutable history files, with each historical version being preserved with its own ETag.

## Verification and Usage

### API Endpoints

The system provides API endpoints to verify ETag-based concurrency control:

- `GET /gs1/verify/{entityType}/{entityId}` - Verify ETag exists for a specific entity
- `GET /gs1/verify/metadata` - Verify ETag exists for system metadata

### CLI Commands

CLI commands for verification:

```bash
# Verify ETag concurrency control for a product
yarn gs1:verify -t product -i 01/12345678901234

# Verify ETag concurrency control for system metadata
yarn gs1:verify -t metadata -i system

# Using the verification script
./verify-integrity.sh product 01/12345678901234
```

## Usage Examples

### Retrieving Data with ETag for Updates

To update data, first retrieve it with the ETag:

```
GET /gs1/products/01/12345678901234?includeETag=true
```

Response:
```json
{
  "id": "01/12345678901234",
  "name": "Product Name",
  "data": "...",
  "_etag": "a1b2c3d4..."
}
```

### Updating with ETag Validation

When updating, include the original ETag:

```
POST /gs1/products/01/12345678901234
{
  "id": "01/12345678901234",
  "name": "Updated Product Name",
  "data": "...",
  "_etag": "a1b2c3d4..."
}
```

If the object has been modified by another process since retrieval, the update will fail with a 409 Conflict response, indicating that the client needs to fetch the latest version and try again.

## Benefits

1. **Tamper Detection**: The ETag mechanism ensures data hasn't been modified unexpectedly.

2. **Corruption Prevention**: By verifying ETags before updates, we prevent accidental overwrites of data changed by other processes.

3. **Optimistic Concurrency**: The system provides optimistic concurrency control, allowing high throughput while still preventing data corruption from concurrent modifications.

4. **Audit Trail**: Immutable history records provide a complete audit trail of all changes to product data.

## Implementation Details

- `MinioService` includes methods for handling ETags, such as `getFileWithETag`, `uploadFile` (with optional ETag parameter), and `getETag`.
- `GS1StorageService` leverages these methods to implement ETag-based concurrency control at a higher level.
- `GS1ResolverService` provides a clean API that handles ETags transparently for client applications. 