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
 * │   └── {company_id}.json         # Manufacturer information
 * └── metadata/
 *     ├── last_updated.json         # System-wide update timestamp
 *     └── product_index.json        # Quick lookup index
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
   */
  async getProduct(productId: string): Promise<any> {
    const key = this.getObjectKey(`products/${productId}.json`);
    return this.minioService.getFile(key);
  }

  /**
   * Save product information
   */
  async saveProduct(productId: string, data: any): Promise<boolean> {
    const key = this.getObjectKey(`products/${productId}.json`);
    return this.minioService.uploadFile(key, data);
  }

  /**
   * Get product certificate
   */
  async getProductCertificate(productId: string, certificateId: string): Promise<any> {
    const key = this.getObjectKey(`products/${productId}/certificates/${certificateId}.json`);
    return this.minioService.getFile(key);
  }

  /**
   * Save product certificate
   */
  async saveProductCertificate(productId: string, certificateId: string, data: any): Promise<boolean> {
    const key = this.getObjectKey(`products/${productId}/certificates/${certificateId}.json`);
    return this.minioService.uploadFile(key, data);
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
        checksum: this.generateChecksum(data),
      }
    };
    
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
    return this.minioService.getFile(key);
  }

  /**
   * Save company information
   */
  async saveCompany(companyId: string, data: any): Promise<boolean> {
    const key = this.getObjectKey(`companies/${companyId}.json`);
    return this.minioService.uploadFile(key, data);
  }

  /**
   * Get system-wide metadata (last_updated.json)
   */
  async getSystemMetadata(): Promise<any> {
    const key = this.getObjectKey('metadata/last_updated.json');
    return this.minioService.getFile(key);
  }

  /**
   * Update system-wide metadata
   */
  async updateSystemMetadata(data: any): Promise<boolean> {
    const key = this.getObjectKey('metadata/last_updated.json');
    
    // Get existing data and merge
    const existingData = await this.minioService.getFile(key) || {};
    const updatedData = {
      ...existingData,
      ...data,
      lastUpdated: new Date().toISOString(),
      version: (existingData.version || 0) + 1,
    };
    
    return this.minioService.uploadFile(key, updatedData);
  }

  /**
   * Get product index
   */
  async getProductIndex(): Promise<any> {
    const key = this.getObjectKey('metadata/product_index.json');
    return this.minioService.getFile(key);
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
    const existingIndex = await this.minioService.getFile(key) || { products: {} };
    
    // Update the specific product entry
    existingIndex.products[productId] = {
      ...indexData,
      updatedAt: new Date().toISOString(),
    };
    
    // Update lastUpdated timestamp
    existingIndex.lastUpdated = new Date().toISOString();
    
    return this.minioService.uploadFile(key, existingIndex);
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
      
      await this.updateSystemMetadata(systemMetadata);
      
      // Create initial product index
      const productIndex = {
        lastUpdated: new Date().toISOString(),
        products: {},
      };
      
      const indexKey = this.getObjectKey('metadata/product_index.json');
      await this.minioService.uploadFile(indexKey, productIndex);
      
      this.logger.log('GS1 identity resolver structure initialized');
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize GS1 structure: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Generate a simple checksum for data verification
   * In a production environment, use a cryptographic hash
   */
  private generateChecksum(data: any): string {
    // Simple implementation for demo purposes
    const jsonStr = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(16);
  }
} 