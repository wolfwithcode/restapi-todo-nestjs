# Data Integrity Mechanisms for S3/MinIO Storage

Since S3 and MinIO storage lack the strong consistency guarantees of traditional databases, we have implemented additional data integrity mechanisms to ensure data reliability and prevent corruption or tampering.

## Implementation Details

### 1. SHA-256 Hash Verification

Every data file in our GS1 Identity Resolver system has a corresponding hash file:

- For each `{file}.json`, we maintain a `{file}.hash` file
- The hash file contains:
  - A SHA-256 hash of the original data file
  - A timestamp of when the hash was generated

When retrieving data, the system:
1. Gets both the data file and its corresponding hash file
2. Recalculates the SHA-256 hash of the data file
3. Compares it with the stored hash
4. Issues warnings if hashes don't match, indicating potential tampering or corruption

### 2. Pre-Update Hash Validation

To prevent concurrent modification conflicts:

1. When retrieving data for modification purposes, the system includes the current hash in the response (as `_hash`)
2. When updating data, clients must include this original hash
3. Before processing the update, the system:
   - Recalculates the current hash of the file
   - Compares it with the provided hash
   - Rejects the update if hashes don't match, indicating the file was modified elsewhere

### 3. Immutable History Records

For product data, all changes are recorded in history files:

- History records include their own hash embedded in the record
- History files are immutable and never modified after creation
- Each history entry contains complete data at that point in time

### 4. Integrity Verification Tools

The system provides multiple tools to verify data integrity:

#### API Endpoints:
- `GET /gs1/verify/{entityType}/{entityId}` - Verifies integrity of a specific entity
- `GET /gs1/verify/metadata` - Verifies system-wide metadata integrity

#### CLI Commands:
- `yarn gs1:verify -t <entityType> -i <entityId>` - Verifies integrity via command line
- `./verify-integrity.sh <entityType> <entityId>` - Convenient shell script for verification

## Usage Examples

### Retrieve Data with Hash for Update Operations

```http
GET /gs1/products/01/12345678901234?includeHash=true
```

Response includes the `_hash` field:
```json
{
  "id": "01/12345678901234",
  "name": "Organic Apple Juice",
  "_hash": "a1b2c3d4e5f6..."
}
```

### Update with Hash Validation

```http
PUT /gs1/products/01/12345678901234
{
  "id": "01/12345678901234",
  "name": "Updated Organic Apple Juice",
  "_hash": "a1b2c3d4e5f6..."
}
```

The system will validate that the hash matches before applying the update.

### Verify Data Integrity

```bash
# Verify product integrity
./verify-integrity.sh product 01/12345678901234

# Verify system metadata integrity
./verify-integrity.sh metadata system
```

## Benefits

- **Tamper Detection**: Any unauthorized changes to data files can be detected
- **Corruption Prevention**: Accidental corruption of data during transit or storage can be identified
- **Optimistic Concurrency**: Prevents conflicting updates without locking
- **Audit Trail**: History records provide a verifiable audit trail of all changes 