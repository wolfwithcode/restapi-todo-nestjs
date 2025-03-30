import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from './minio.service';

/**
 * Storage service for GS1 Identity Resolver data
 * 
 * Implements the hierarchical folder structure:
 * gs1-resolver/
 * ├── products/
 * │   ├── {product_id}.json         # Current product information
 * │   └── {product_id}/
 * │       ├── certificates/{cert_id}.json  # Related certificates
 * │       └── history/{timestamp}.json     # Change history records
 * ├── companies/
 * │   ├── {company_id}.json         # Manufacturer information
 * └── metadata/
 *     ├── last_updated.json         # System-wide update timestamp
 *     └── product_index.json        # Quick lookup index
 *
 * Uses S3 ETags for optimistic concurrency control
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
   * Get product information
   * @returns Product data with ETag for concurrency control
   */
  async getProduct(productId: string): Promise<any> {
    const key = this.getObjectKey(`products/${productId}.json`);
    const result = await this.minioService.getFileWithETag(key);
    return result ? result.data : null;
  }

  /**
   * Get product with ETag for concurrency control
   */
  async getProductWithETag(productId: string): Promise<{ data: any; etag: string } | null> {
    const key = this.getObjectKey(`products/${productId}.json`);
    return this.minioService.getFileWithETag(key);
  }

  /**
   * Save product information
   * @param productId Product ID
   * @param data Product data
   * @param ifMatch Optional ETag for concurrency control
   */
  async saveProduct(productId: string, data: any, ifMatch?: string): Promise<boolean> {
    const key = this.getObjectKey(`products/${productId}.json`);
    const result = await this.minioService.uploadFile(key, data, 'application/json', ifMatch);
    return result.success;
  }

  /**
   * Get product certificate
   */
  async getProductCertificate(productId: string, certificateId: string): Promise<any> {
    const key = this.getObjectKey(`products/${productId}/certificates/${certificateId}.json`);
    const result = await this.minioService.getFileWithETag(key);
    return result ? result.data : null;
  }

  /**
   * Get certificate with ETag for concurrency control
   */
  async getProductCertificateWithETag(productId: string, certificateId: string): Promise<{ data: any; etag: string } | null> {
    const key = this.getObjectKey(`products/${productId}/certificates/${certificateId}.json`);
    return this.minioService.getFileWithETag(key);
  }

  /**
   * Save product certificate
   */
  async saveProductCertificate(productId: string, certificateId: string, data: any, ifMatch?: string): Promise<boolean> {
    const key = this.getObjectKey(`products/${productId}/certificates/${certificateId}.json`);
    const result = await this.minioService.uploadFile(key, data, 'application/json', ifMatch);
    return result.success;
  }

  /**
   * Add product history record
   */
  async addProductHistory(productId: string, data: any): Promise<boolean> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = this.getObjectKey(`products/${productId}/history/${timestamp}.json`);
    
    // Add audit metadata
    const historyData = {
      ...data,
      timestamp,
      metadata: {
        recordedAt: new Date().toISOString()
      }
    };
    
    // History records are immutable, so no need for ETag checking
    const result = await this.minioService.uploadFile(key, historyData);
    return result.success;
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
    const result = await this.minioService.getFileWithETag(key);
    return result ? result.data : null;
  }

  /**
   * Get company with ETag for concurrency control
   */
  async getCompanyWithETag(companyId: string): Promise<{ data: any; etag: string } | null> {
    const key = this.getObjectKey(`companies/${companyId}.json`);
    return this.minioService.getFileWithETag(key);
  }

  /**
   * Save company information
   */
  async saveCompany(companyId: string, data: any, ifMatch?: string): Promise<boolean> {
    const key = this.getObjectKey(`companies/${companyId}.json`);
    const result = await this.minioService.uploadFile(key, data, 'application/json', ifMatch);
    return result.success;
  }

  /**
   * Get system-wide metadata (last_updated.json)
   */
  async getSystemMetadata(): Promise<any> {
    const key = this.getObjectKey('metadata/last_updated.json');
    const result = await this.minioService.getFileWithETag(key);
    return result ? result.data : null;
  }

  /**
   * Get system metadata with ETag for concurrency control
   */
  async getSystemMetadataWithETag(): Promise<{ data: any; etag: string } | null> {
    const key = this.getObjectKey('metadata/last_updated.json');
    return this.minioService.getFileWithETag(key);
  }

  /**
   * Update system-wide metadata
   */
  async updateSystemMetadata(data: any, ifMatch?: string): Promise<boolean> {
    const key = this.getObjectKey('metadata/last_updated.json');
    
    // Get existing data and merge
    const existing = await this.minioService.getFileWithETag(key);
    const existingData = existing?.data || {};
    
    const updatedData = {
      ...existingData,
      ...data,
      lastUpdated: new Date().toISOString(),
      version: (existingData.version || 0) + 1,
    };
    
    // Use the ETag from existing data if provided, otherwise use the passed ifMatch
    const etagToUse = existing?.etag || ifMatch;
    
    const result = await this.minioService.uploadFile(key, updatedData, 'application/json', etagToUse);
    return result.success;
  }

  /**
   * Get product index
   */
  async getProductIndex(): Promise<any> {
    const key = this.getObjectKey('metadata/product_index.json');
    const result = await this.minioService.getFileWithETag(key);
    return result ? result.data : null;
  }

  /**
   * Get product index with ETag for concurrency control
   */
  async getProductIndexWithETag(): Promise<{ data: any; etag: string } | null> {
    const key = this.getObjectKey('metadata/product_index.json');
    return this.minioService.getFileWithETag(key);
  }

  /**
   * Update product index
   * 
   * The index provides a quick lookup for basic product information
   * without having to access individual product files
   */
  async updateProductIndex(productId: string, indexData: any, ifMatch?: string): Promise<boolean> {
    const key = this.getObjectKey('metadata/product_index.json');
    
    // Get existing index
    const existing = await this.minioService.getFileWithETag(key);
    const existingIndex = existing?.data || { products: {} };
    
    // Update the specific product entry
    existingIndex.products[productId] = {
      ...existingIndex.products[productId],
      ...indexData,
      updatedAt: new Date().toISOString(),
    };
    
    // Update lastUpdated timestamp
    existingIndex.lastUpdated = new Date().toISOString();
    
    // Use the ETag from existing data if provided, otherwise use the passed ifMatch
    const etagToUse = existing?.etag || ifMatch;
    
    const result = await this.minioService.uploadFile(key, existingIndex, 'application/json', etagToUse);
    return result.success;
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
      const metadataResult = await this.minioService.uploadFile(metadataKey, systemMetadata);
      
      if (!metadataResult.success) {
        this.logger.error('Failed to create system metadata');
        return false;
      }
      
      // Create initial product index
      const productIndex = {
        lastUpdated: new Date().toISOString(),
        products: {},
      };
      
      const indexKey = this.getObjectKey('metadata/product_index.json');
      const indexResult = await this.minioService.uploadFile(indexKey, productIndex);
      
      if (!indexResult.success) {
        this.logger.error('Failed to create product index');
        return false;
      }
      
      this.logger.log('GS1 identity resolver structure initialized with ETag-based concurrency control');
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize GS1 structure: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get the current ETag of an object, used for concurrency control
   */
  async getObjectETag(path: string): Promise<string | null> {
    const key = this.getObjectKey(path);
    return this.minioService.getETag(key);
  }
} 