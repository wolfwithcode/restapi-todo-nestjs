import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
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
   * Get product with ETag for update operations
   * This includes the ETag needed for concurrency control
   */
  async getProductWithETag(productId: string): Promise<any> {
    const result = await this.gs1Storage.getProductWithETag(productId);
    if (!result) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    // Add ETag to the response for client-side concurrency control
    return {
      ...result.data,
      _etag: result.etag
    };
  }

  /**
   * Create or update product information
   */
  async upsertProduct(productId: string, data: any): Promise<any> {
    // Get current product data (if exists)
    const existingProduct = await this.gs1Storage.getProductWithETag(productId);
    
    // Extract ETag for concurrency control if provided
    const etag = data._etag;
    if (etag) {
      // Remove the _etag property before saving
      delete data._etag;
    }
    
    // When updating existing product, ETag is required
    if (existingProduct && !etag) {
      throw new BadRequestException(
        'ETag is required for updates. Retrieve the resource with ?includeETag=true first.'
      );
    }
    
    // Add metadata
    const productData = {
      ...data,
      id: productId,
      updatedAt: new Date().toISOString(),
      createdAt: existingProduct ? existingProduct.data.createdAt : new Date().toISOString(),
    };
    
    // Save product data with ETag validation
    const success = await this.gs1Storage.saveProduct(productId, productData, etag);
    if (!success) {
      throw new ConflictException(
        'Concurrency conflict: The product has been modified since you retrieved it. Please get the latest version and try again.'
      );
    }
    
    // If product existed, add a history record
    if (existingProduct) {
      await this.gs1Storage.addProductHistory(productId, existingProduct.data);
    }
    
    // Update the product index for quick lookup
    await this.updateProductIndex(productId, {
      id: productId,
      name: data.name,
      companyId: data.companyId,
      certificateIds: data.certificateIds || [],
    });
    
    // Get the fresh product with new ETag
    const updatedProduct = await this.gs1Storage.getProductWithETag(productId);
    return {
      ...updatedProduct?.data,
      _etag: updatedProduct?.etag
    };
  }

  /**
   * Delete product information
   */
  async deleteProduct(productId: string, etag?: string): Promise<boolean> {
    // Get current product data
    const existingProduct = await this.gs1Storage.getProductWithETag(productId);
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    // Add a deletion record to history
    await this.gs1Storage.addProductHistory(productId, {
      ...existingProduct.data,
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
   * Get certificate with ETag for update operations
   */
  async getCertificateWithETag(productId: string, certificateId: string): Promise<any> {
    const product = await this.gs1Storage.getProduct(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    const certificate = await this.gs1Storage.getProductCertificateWithETag(productId, certificateId);
    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${certificateId} not found`);
    }
    
    // Add ETag to the response for client-side concurrency control
    return {
      ...certificate.data,
      _etag: certificate.etag
    };
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
    
    // Extract ETag for concurrency control if provided
    const etag = certificateData._etag;
    if (etag) {
      // Remove the _etag property before saving
      delete certificateData._etag;
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
    
    // Save certificate with ETag validation (if updating)
    const success = await this.gs1Storage.saveProductCertificate(
      productId, 
      certificateData.id,
      certData,
      etag
    );
    
    if (!success) {
      throw new ConflictException(
        'Concurrency conflict: The certificate has been modified since you retrieved it. Please get the latest version and try again.'
      );
    }
    
    // Update product to reference the certificate
    const productWithETag = await this.gs1Storage.getProductWithETag(productId);
    if (!productWithETag) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    const updatedCertIds = [...(productWithETag.data.certificateIds || []), certificateData.id];
    const productUpdateSuccess = await this.gs1Storage.saveProduct(
      productId, 
      {
        ...productWithETag.data,
        certificateIds: updatedCertIds,
        updatedAt: new Date().toISOString(),
      },
      productWithETag.etag
    );
    
    if (!productUpdateSuccess) {
      throw new ConflictException(
        'Concurrency conflict: The product has been modified during certificate addition. Please try again.'
      );
    }
    
    // Add to product index
    await this.updateProductIndex(productId, {
      certificateIds: updatedCertIds,
    });
    
    // Get the fresh certificate with new ETag
    const updatedCert = await this.gs1Storage.getProductCertificateWithETag(productId, certificateData.id);
    return {
      ...updatedCert?.data,
      _etag: updatedCert?.etag
    };
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
   * Get company with ETag for update operations
   */
  async getCompanyWithETag(companyId: string): Promise<any> {
    const company = await this.gs1Storage.getCompanyWithETag(companyId);
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }
    
    // Add ETag to the response for client-side concurrency control
    return {
      ...company.data,
      _etag: company.etag
    };
  }

  /**
   * Create or update company information
   */
  async upsertCompany(companyId: string, data: any): Promise<any> {
    // Check if company exists
    const existingCompany = await this.gs1Storage.getCompanyWithETag(companyId);
    
    // Extract ETag for concurrency control if provided
    const etag = data._etag;
    if (etag) {
      // Remove the _etag property before saving
      delete data._etag;
    }
    
    // When updating existing company, ETag is required
    if (existingCompany && !etag) {
      throw new BadRequestException(
        'ETag is required for updates. Retrieve the resource with ?includeETag=true first.'
      );
    }
    
    // Add metadata
    const companyData = {
      ...data,
      id: companyId,
      updatedAt: new Date().toISOString(),
      createdAt: existingCompany ? existingCompany.data.createdAt : new Date().toISOString(),
    };
    
    // Save company data with ETag validation
    const success = await this.gs1Storage.saveCompany(companyId, companyData, etag);
    if (!success) {
      throw new ConflictException(
        'Concurrency conflict: The company has been modified since you retrieved it. Please get the latest version and try again.'
      );
    }
    
    // Get the fresh company with new ETag
    const updatedCompany = await this.gs1Storage.getCompanyWithETag(companyId);
    return {
      ...updatedCompany?.data,
      _etag: updatedCompany?.etag
    };
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
   * Verify ETag-based concurrency control for a specific entity
   * This tests that ETags are working correctly
   */
  async verifyETagConcurrency(entityType: string, entityId: string): Promise<any> {
    let entity: any = null;
    let etag: string | null = null;
    
    switch (entityType) {
      case 'product':
        entity = await this.gs1Storage.getProductWithETag(entityId);
        etag = entity?.etag || null;
        break;
      case 'company':
        entity = await this.gs1Storage.getCompanyWithETag(entityId);
        etag = entity?.etag || null;
        break;
      case 'metadata':
        if (entityId === 'system') {
          entity = await this.gs1Storage.getSystemMetadataWithETag();
          etag = entity?.etag || null;
        }
        break;
      default:
        throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }
    
    if (!entity) {
      throw new NotFoundException(`Entity not found: ${entityType}/${entityId}`);
    }
    
    return {
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      hasETag: !!etag,
      etag: etag,
      concurrencyControlReady: !!etag
    };
  }
} 