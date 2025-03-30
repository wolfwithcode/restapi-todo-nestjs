import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GS1StorageService } from '../storage/gs1-storage.service';

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
   * Create or update product information
   */
  async upsertProduct(productId: string, data: any): Promise<any> {
    // Get current product data (if exists)
    const existingProduct = await this.gs1Storage.getProduct(productId);
    
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
   * Create or update company information
   */
  async upsertCompany(companyId: string, data: any): Promise<any> {
    // Add metadata
    const companyData = {
      ...data,
      id: companyId,
      updatedAt: new Date().toISOString(),
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
} 