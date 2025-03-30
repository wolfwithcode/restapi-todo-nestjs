import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from './minio.service';
import { HashUtil } from '../common/utils/hash.util';

/**
 * Storage service for GS1 Identity Resolver data
 * 
 * Implements the hierarchical folder structure:
 * gs1-resolver/
 * ├── products/
 * │   ├── {product_id}.json         # Current product information
 * │   ├── {product_id}.hash         # SHA-256 hash file for data integrity
 * │   └── {product_id}/
 * │       ├── certificates/{cert_id}.json  # Related certificates
 * │       ├── certificates/{cert_id}.hash  # Certificate hash files
 * │       └── history/{timestamp}.json     # Change history records
 * ├── companies/
 * │   ├── {company_id}.json         # Manufacturer information
 * │   └── {company_id}.hash         # SHA-256 hash file
 * └── metadata/
 *     ├── last_updated.json         # System-wide update timestamp
 *     ├── last_updated.hash         # Hash for metadata integrity
 *     ├── product_index.json        # Quick lookup index
 *     └── product_index.hash        # Hash for index integrity
 */
@Injectable()
export class GS1StorageService {
  private readonly logger = new Logger(GS1StorageService.name);
  private readonly rootPrefix = 'gs1-resolver';

  constructor(private readonly minioService: MinioService) {}

  /**
   * Get the full object key path
   */
  private getObjectKey(path: string): string {
    return `${this.rootPrefix}/${path}`;
  }

  /**
   * Get hash file key for a given data key
   */
  private getHashKey(dataKey: string): string {
    return dataKey.replace('.json', '.hash');
  }

  /**
   * Save data with hash verification
   */
  private async saveWithHash(key: string, data: any): Promise<boolean> {
    try {
      // Generate hash for data integrity
      const hash = HashUtil.generateSHA256(data);
      
      // Save the actual data
      const dataSuccess = await this.minioService.uploadFile(key, data);
      if (!dataSuccess) {
        this.logger.error(`Failed to save data to ${key}`);
        return false;
      }
      
      // Save the hash in a separate file
      const hashKey = this.getHashKey(key);
      const hashSuccess = await this.minioService.uploadFile(
        hashKey, 
        { hash, timestamp: new Date().toISOString() },
        'application/json'
      );
      
      if (!hashSuccess) {
        this.logger.error(`Failed to save hash to ${hashKey}`);
        // Consider rolling back the data save here
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error saving data with hash: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get data with hash verification
   */
  private async getWithHashVerification(key: string): Promise<any> {
    try {
      // Get the data
      const data = await this.minioService.getFile(key);
      if (!data) {
        return null;
      }
      
      // Get the hash
      const hashKey = this.getHashKey(key);
      const hashData = await this.minioService.getFile(hashKey);
      
      // If hash file exists, verify data integrity
      if (hashData && hashData.hash) {
        const isValid = HashUtil.verifySHA256(data, hashData.hash);
        if (!isValid) {
          this.logger.warn(`Data integrity check failed for ${key}`);
          // You could choose to throw an error here or return null
          // For now, we're returning the data with a warning
        }
      }
      
      return data;
    } catch (error) {
      this.logger.error(`Error getting data with hash verification: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get product information
   */
  async getProduct(productId: string): Promise<any> {
    const key = this.getObjectKey(`products/${productId}.json`);
    return this.getWithHashVerification(key);
  }

  /**
   * Save product information
   */
  async saveProduct(productId: string, data: any): Promise<boolean> {
    // Perform pre-update hash validation if product already exists
    const key = this.getObjectKey(`products/${productId}.json`);
    
    if (data._hash) {
      // If the data contains a _hash field, verify it matches the current data
      const currentData = await this.minioService.getFile(key);
      if (currentData) {
        const currentHash = HashUtil.generateSHA256(currentData);
        if (currentHash !== data._hash) {
          this.logger.warn(`Pre-update hash validation failed for ${key}`);
          return false;
        }
        
        // Remove the _hash field before saving
        delete data._hash;
      }
    }
    
    return this.saveWithHash(key, data);
  }

  /**
   * Get product certificate
   */
  async getProductCertificate(productId: string, certificateId: string): Promise<any> {
    const key = this.getObjectKey(`products/${productId}/certificates/${certificateId}.json`);
    return this.getWithHashVerification(key);
  }

  /**
   * Save product certificate
   */
  async saveProductCertificate(productId: string, certificateId: string, data: any): Promise<boolean> {
    const key = this.getObjectKey(`products/${productId}/certificates/${certificateId}.json`);
    return this.saveWithHash(key, data);
  }

  /**
   * Add product history record
   */
  async addProductHistory(productId: string, data: any): Promise<boolean> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = this.getObjectKey(`products/${productId}/history/${timestamp}.json`);
    
    // Add checksums and audit metadata
    const historyData = {
      ...data,
      timestamp,
      metadata: {
        recordedAt: new Date().toISOString(),
        hash: HashUtil.generateSHA256(data)
      }
    };
    
    // History records don't need separate hash files since they include the hash
    // and are immutable once written
    return this.minioService.uploadFile(key, historyData);
  }

  /**
   * List product history records
   */
  async listProductHistory(productId: string): Promise<string[]> {
    const prefix = this.getObjectKey(`products/${productId}/history/`);
    const files = await this.minioService.listFiles(prefix);
    
    // Extract timestamps from full paths
    return files.map(file => {
      const parts = file.split('/');
      return parts[parts.length - 1].replace('.json', '');
    });
  }

  /**
   * Get product history record
   */
  async getProductHistory(productId: string, timestamp: string): Promise<any> {
    const key = this.getObjectKey(`products/${productId}/history/${timestamp}.json`);
    return this.minioService.getFile(key);
  }

  /**
   * Get company information
   */
  async getCompany(companyId: string): Promise<any> {
    const key = this.getObjectKey(`companies/${companyId}.json`);
    return this.getWithHashVerification(key);
  }

  /**
   * Save company information
   */
  async saveCompany(companyId: string, data: any): Promise<boolean> {
    // Perform pre-update hash validation if company already exists
    const key = this.getObjectKey(`companies/${companyId}.json`);
    
    if (data._hash) {
      // If the data contains a _hash field, verify it matches the current data
      const currentData = await this.minioService.getFile(key);
      if (currentData) {
        const currentHash = HashUtil.generateSHA256(currentData);
        if (currentHash !== data._hash) {
          this.logger.warn(`Pre-update hash validation failed for ${key}`);
          return false;
        }
        
        // Remove the _hash field before saving
        delete data._hash;
      }
    }
    
    return this.saveWithHash(key, data);
  }

  /**
   * Get system-wide metadata (last_updated.json)
   */
  async getSystemMetadata(): Promise<any> {
    const key = this.getObjectKey('metadata/last_updated.json');
    return this.getWithHashVerification(key);
  }

  /**
   * Update system-wide metadata
   */
  async updateSystemMetadata(data: any): Promise<boolean> {
    const key = this.getObjectKey('metadata/last_updated.json');
    
    // Get existing data and merge
    const existingData = await this.getWithHashVerification(key) || {};
    const updatedData = {
      ...existingData,
      ...data,
      lastUpdated: new Date().toISOString(),
      version: (existingData.version || 0) + 1,
    };
    
    return this.saveWithHash(key, updatedData);
  }

  /**
   * Get product index
   */
  async getProductIndex(): Promise<any> {
    const key = this.getObjectKey('metadata/product_index.json');
    return this.getWithHashVerification(key);
  }

  /**
   * Update product index
   * 
   * The index provides a quick lookup for basic product information
   * without having to access individual product files
   */
  async updateProductIndex(productId: string, indexData: any): Promise<boolean> {
    const key = this.getObjectKey('metadata/product_index.json');
    
    // Get existing index
    const existingIndex = await this.getWithHashVerification(key) || { products: {} };
    
    // Update the specific product entry
    existingIndex.products[productId] = {
      ...existingIndex.products[productId],
      ...indexData,
      updatedAt: new Date().toISOString(),
    };
    
    // Update lastUpdated timestamp
    existingIndex.lastUpdated = new Date().toISOString();
    
    return this.saveWithHash(key, existingIndex);
  }

  /**
   * Initialize the GS1 identity resolver structure
   */
  async initializeStructure(): Promise<boolean> {
    try {
      // Create initial system metadata
      const systemMetadata = {
        lastUpdated: new Date().toISOString(),
        version: 1,
        initialized: true,
      };
      
      const metadataKey = this.getObjectKey('metadata/last_updated.json');
      await this.saveWithHash(metadataKey, systemMetadata);
      
      // Create initial product index
      const productIndex = {
        lastUpdated: new Date().toISOString(),
        products: {},
      };
      
      const indexKey = this.getObjectKey('metadata/product_index.json');
      await this.saveWithHash(indexKey, productIndex);
      
      this.logger.log('GS1 identity resolver structure initialized with data integrity mechanisms');
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize GS1 structure: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Verify data integrity for a specific file
   */
  async verifyDataIntegrity(key: string): Promise<boolean> {
    const fullKey = this.getObjectKey(key);
    
    // Get the data and hash file
    const data = await this.minioService.getFile(fullKey);
    if (!data) {
      this.logger.warn(`File not found: ${fullKey}`);
      return false;
    }
    
    const hashKey = this.getHashKey(fullKey);
    const hashData = await this.minioService.getFile(hashKey);
    
    if (!hashData || !hashData.hash) {
      this.logger.warn(`Hash file not found: ${hashKey}`);
      return false;
    }
    
    // Verify data integrity
    const isValid = HashUtil.verifySHA256(data, hashData.hash);
    if (!isValid) {
      this.logger.warn(`Data integrity check failed for ${fullKey}`);
    }
    
    return isValid;
  }

  /**
   * Get the current hash of an object, used for pre-update validation
   */
  async getCurrentHash(key: string): Promise<string | null> {
    const fullKey = this.getObjectKey(key);
    const data = await this.minioService.getFile(fullKey);
    
    if (!data) {
      return null;
    }
    
    return HashUtil.generateSHA256(data);
  }
} 