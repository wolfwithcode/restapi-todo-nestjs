import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { GS1StorageService } from '../storage/gs1-storage.service';
import { HashUtil } from '../common/utils/hash.util';

/**
 * Service for GS1 identity resolver operations
 */
@Injectable()
export class GS1ResolverService {
  private readonly logger = new Logger(GS1ResolverService.name);

  constructor(private readonly gs1Storage: GS1StorageService) {}

  /**
   * Initialize the GS1 identity resolver system
   */
  async initialize(): Promise<boolean> {
    return this.gs1Storage.initializeStructure();
  }

  /**
   * Get product information by ID
   */
  async getProduct(productId: string): Promise<any> {
    const product = await this.gs1Storage.getProduct(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    return product;
  }

  /**
   * Get product with hash for update operations
   * This includes the current hash for pre-update validation
   */
  async getProductWithHash(productId: string): Promise<any> {
    const product = await this.getProduct(productId);
    if (product) {
      // Add current hash for pre-update validation
      const productKey = `products/${productId}.json`;
      const currentHash = await this.gs1Storage.getCurrentHash(productKey);
      if (currentHash) {
        product._hash = currentHash;
      }
    }
    return product;
  }

  /**
   * Create or update product information
   */
  async upsertProduct(productId: string, data: any): Promise<any> {
    // Get current product data (if exists)
    const existingProduct = await this.gs1Storage.getProduct(productId);
    
    // Validate hash if this is an update and hash was provided
    if (existingProduct && data._hash) {
      const productKey = `products/${productId}.json`;
      const currentHash = await this.gs1Storage.getCurrentHash(productKey);
      
      if (currentHash && currentHash !== data._hash) {
        throw new BadRequestException(
          'Data integrity check failed: The product has been modified since you retrieved it'
        );
      }
    }
    
    // Add metadata
    const productData = {
      ...data,
      id: productId,
      updatedAt: new Date().toISOString(),
      createdAt: existingProduct?.createdAt || new Date().toISOString(),
    };
    
    // Save product data
    const success = await this.gs1Storage.saveProduct(productId, productData);
    if (!success) {
      throw new Error(`Failed to save product ${productId}`);
    }
    
    // If product existed, add a history record
    if (existingProduct) {
      await this.gs1Storage.addProductHistory(productId, existingProduct);
    }
    
    // Update the product index for quick lookup
    await this.updateProductIndex(productId, {
      id: productId,
      name: data.name,
      companyId: data.companyId,
      certificateIds: data.certificateIds || [],
    });
    
    return productData;
  }

  /**
   * Delete product information
   */
  async deleteProduct(productId: string): Promise<boolean> {
    // Get current product data
    const existingProduct = await this.gs1Storage.getProduct(productId);
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    // Add a deletion record to history
    await this.gs1Storage.addProductHistory(productId, {
      ...existingProduct,
      deletedAt: new Date().toISOString(),
      _deleted: true,
    });
    
    // Get the product index and remove this product
    const productIndex = await this.gs1Storage.getProductIndex();
    if (productIndex?.products?.[productId]) {
      delete productIndex.products[productId];
      productIndex.lastUpdated = new Date().toISOString();
      await this.gs1Storage.updateSystemMetadata({
        lastUpdated: new Date().toISOString(),
        changeType: 'product_deletion',
        productId,
      });
    }
    
    return true;
  }

  /**
   * Get product certificates
   */
  async getProductCertificates(productId: string): Promise<any[]> {
    // Check if product exists
    const product = await this.gs1Storage.getProduct(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    // Get certificates if any are referenced
    const certificates: any[] = [];
    if (product.certificateIds && Array.isArray(product.certificateIds)) {
      for (const certId of product.certificateIds) {
        const cert = await this.gs1Storage.getProductCertificate(productId, certId);
        if (cert) {
          certificates.push(cert);
        }
      }
    }
    
    return certificates;
  }

  /**
   * Get certificate with hash for update operations
   */
  async getCertificateWithHash(productId: string, certificateId: string): Promise<any> {
    const product = await this.gs1Storage.getProduct(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    const certificate = await this.gs1Storage.getProductCertificate(productId, certificateId);
    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${certificateId} not found`);
    }
    
    // Add current hash for pre-update validation
    const certKey = `products/${productId}/certificates/${certificateId}.json`;
    const currentHash = await this.gs1Storage.getCurrentHash(certKey);
    if (currentHash) {
      certificate._hash = currentHash;
    }
    
    return certificate;
  }

  /**
   * Add a certificate to a product
   */
  async addProductCertificate(productId: string, certificateData: any): Promise<any> {
    // Check if product exists
    const product = await this.gs1Storage.getProduct(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    // Generate certificate ID if not provided
    if (!certificateData.id) {
      certificateData.id = `cert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Add metadata
    const certData = {
      ...certificateData,
      productId,
      createdAt: new Date().toISOString(),
    };
    
    // Save certificate
    const success = await this.gs1Storage.saveProductCertificate(
      productId, 
      certificateData.id,
      certData
    );
    
    if (!success) {
      throw new Error(`Failed to save certificate for product ${productId}`);
    }
    
    // Update product to reference the certificate
    const updatedCertIds = [...(product.certificateIds || []), certificateData.id];
    await this.gs1Storage.saveProduct(productId, {
      ...product,
      certificateIds: updatedCertIds,
      updatedAt: new Date().toISOString(),
    });
    
    // Add to product index
    await this.updateProductIndex(productId, {
      certificateIds: updatedCertIds,
    });
    
    return certData;
  }

  /**
   * Get product history records
   */
  async getProductHistory(productId: string): Promise<any[]> {
    // Check if product exists
    const product = await this.gs1Storage.getProduct(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    // Get history timestamps
    const timestamps = await this.gs1Storage.listProductHistory(productId);
    
    // Get history records
    const historyRecords: any[] = [];
    for (const timestamp of timestamps) {
      const record = await this.gs1Storage.getProductHistory(productId, timestamp);
      if (record) {
        historyRecords.push(record);
      }
    }
    
    // Sort by timestamp (newest first)
    return historyRecords.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Get company information
   */
  async getCompany(companyId: string): Promise<any> {
    const company = await this.gs1Storage.getCompany(companyId);
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }
    return company;
  }

  /**
   * Get company with hash for update operations
   */
  async getCompanyWithHash(companyId: string): Promise<any> {
    const company = await this.getCompany(companyId);
    if (company) {
      // Add current hash for pre-update validation
      const companyKey = `companies/${companyId}.json`;
      const currentHash = await this.gs1Storage.getCurrentHash(companyKey);
      if (currentHash) {
        company._hash = currentHash;
      }
    }
    return company;
  }

  /**
   * Create or update company information
   */
  async upsertCompany(companyId: string, data: any): Promise<any> {
    // Validate hash if this is an update and hash was provided
    const existingCompany = await this.gs1Storage.getCompany(companyId);
    
    if (existingCompany && data._hash) {
      const companyKey = `companies/${companyId}.json`;
      const currentHash = await this.gs1Storage.getCurrentHash(companyKey);
      
      if (currentHash && currentHash !== data._hash) {
        throw new BadRequestException(
          'Data integrity check failed: The company has been modified since you retrieved it'
        );
      }
    }
    
    // Add metadata
    const companyData = {
      ...data,
      id: companyId,
      updatedAt: new Date().toISOString(),
      createdAt: existingCompany?.createdAt || new Date().toISOString(),
    };
    
    // Save company data
    const success = await this.gs1Storage.saveCompany(companyId, companyData);
    if (!success) {
      throw new Error(`Failed to save company ${companyId}`);
    }
    
    return companyData;
  }

  /**
   * Get system metadata (last_updated.json)
   */
  async getSystemMetadata(): Promise<any> {
    return this.gs1Storage.getSystemMetadata();
  }

  /**
   * Get product index for quick lookups
   */
  async getProductIndex(): Promise<any> {
    return this.gs1Storage.getProductIndex();
  }

  /**
   * Update product index
   */
  private async updateProductIndex(productId: string, data: any): Promise<boolean> {
    // Get current product index
    const result = await this.gs1Storage.updateProductIndex(productId, data);
    
    // Update system metadata to indicate change
    await this.gs1Storage.updateSystemMetadata({
      lastUpdated: new Date().toISOString(),
      changeType: 'product_update',
      productId,
    });
    
    return result;
  }

  /**
   * Verify data integrity for a specific entity
   * Returns a report of integrity checks
   */
  async verifyIntegrity(entityType: string, entityId: string): Promise<any> {
    let files: string[] = [];
    const results: Record<string, boolean> = {};
    
    switch (entityType) {
      case 'product':
        files = [
          `products/${entityId}.json`,
        ];
        break;
      case 'company':
        files = [
          `companies/${entityId}.json`,
        ];
        break;
      case 'metadata':
        files = [
          'metadata/last_updated.json',
          'metadata/product_index.json',
        ];
        break;
      default:
        throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }
    
    for (const file of files) {
      results[file] = await this.gs1Storage.verifyDataIntegrity(file);
    }
    
    // Add overall status
    const hasFailures = Object.values(results).includes(false);
    
    return {
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      isValid: !hasFailures,
      files: results,
    };
  }
} 