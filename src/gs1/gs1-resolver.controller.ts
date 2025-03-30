import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  NotFoundException,
  Logger,
  Query
} from '@nestjs/common';
import { GS1ResolverService } from './gs1-resolver.service';

@Controller('gs1')
export class GS1ResolverController {
  private readonly logger = new Logger(GS1ResolverController.name);

  constructor(private readonly gs1Service: GS1ResolverService) {}

  @Get('initialize')
  async initialize() {
    this.logger.log('Initializing GS1 identity resolver');
    const result = await this.gs1Service.initialize();
    return { success: result };
  }

  @Get('system/metadata')
  async getSystemMetadata() {
    return this.gs1Service.getSystemMetadata();
  }

  @Get('system/product-index')
  async getProductIndex() {
    return this.gs1Service.getProductIndex();
  }

  // Data Integrity Verification endpoints
  
  @Get('verify/:entityType/:entityId')
  async verifyIntegrity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    return this.gs1Service.verifyIntegrity(entityType, entityId);
  }

  @Get('verify/metadata')
  async verifyMetadataIntegrity() {
    return this.gs1Service.verifyIntegrity('metadata', 'system');
  }

  // Products
  
  @Get('products/:productId')
  async getProduct(
    @Param('productId') productId: string,
    @Query('includeHash') includeHash?: string
  ) {
    if (includeHash === 'true') {
      this.logger.log(`Getting product ${productId} with hash for update validation`);
      return this.gs1Service.getProductWithHash(productId);
    }
    return this.gs1Service.getProduct(productId);
  }

  @Post('products/:productId')
  async createProduct(
    @Param('productId') productId: string,
    @Body() productData: any
  ) {
    return this.gs1Service.upsertProduct(productId, productData);
  }

  @Put('products/:productId')
  async updateProduct(
    @Param('productId') productId: string,
    @Body() productData: any
  ) {
    return this.gs1Service.upsertProduct(productId, productData);
  }

  @Delete('products/:productId')
  async deleteProduct(@Param('productId') productId: string) {
    const success = await this.gs1Service.deleteProduct(productId);
    return { success };
  }

  @Get('products/:productId/history')
  async getProductHistory(@Param('productId') productId: string) {
    return this.gs1Service.getProductHistory(productId);
  }

  // Certificates
  
  @Get('products/:productId/certificates')
  async getProductCertificates(@Param('productId') productId: string) {
    return this.gs1Service.getProductCertificates(productId);
  }

  @Get('products/:productId/certificates/:certificateId')
  async getProductCertificate(
    @Param('productId') productId: string,
    @Param('certificateId') certificateId: string,
    @Query('includeHash') includeHash?: string
  ) {
    if (includeHash === 'true') {
      return this.gs1Service.getCertificateWithHash(productId, certificateId);
    }
    // For regular certificate access, fetch from certificates list
    const certificates = await this.gs1Service.getProductCertificates(productId);
    const certificate = certificates.find(c => c.id === certificateId);
    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${certificateId} not found`);
    }
    return certificate;
  }

  @Post('products/:productId/certificates')
  async addProductCertificate(
    @Param('productId') productId: string,
    @Body() certificateData: any
  ) {
    return this.gs1Service.addProductCertificate(productId, certificateData);
  }

  // Companies
  
  @Get('companies/:companyId')
  async getCompany(
    @Param('companyId') companyId: string,
    @Query('includeHash') includeHash?: string
  ) {
    if (includeHash === 'true') {
      this.logger.log(`Getting company ${companyId} with hash for update validation`);
      return this.gs1Service.getCompanyWithHash(companyId);
    }
    return this.gs1Service.getCompany(companyId);
  }

  @Post('companies/:companyId')
  async createCompany(
    @Param('companyId') companyId: string,
    @Body() companyData: any
  ) {
    return this.gs1Service.upsertCompany(companyId, companyData);
  }

  @Put('companies/:companyId')
  async updateCompany(
    @Param('companyId') companyId: string,
    @Body() companyData: any
  ) {
    return this.gs1Service.upsertCompany(companyId, companyData);
  }

  // GS1 Digital Link resolver
  
  /**
   * Resolve GS1 Digital Link to product information
   * Format: /gs1/{primaryKey}/{value}[/{keyQualifier}/{value}]
   * Example: /gs1/01/12345678901234/10/123456789012345678902
   */
  @Get('/:primaryKey/:primaryValue')
  async resolveBasicLink(
    @Param('primaryKey') primaryKey: string,
    @Param('primaryValue') primaryValue: string
  ) {
    const productId = `${primaryKey}/${primaryValue}`;
    this.logger.log(`Resolving basic GS1 Digital Link: ${productId}`);
    return this.gs1Service.getProduct(productId);
  }

  @Get('/:primaryKey/:primaryValue/:qualifierKey/:qualifierValue')
  async resolveQualifiedLink(
    @Param('primaryKey') primaryKey: string,
    @Param('primaryValue') primaryValue: string,
    @Param('qualifierKey') qualifierKey: string,
    @Param('qualifierValue') qualifierValue: string
  ) {
    const productId = `${primaryKey}/${primaryValue}/${qualifierKey}/${qualifierValue}`;
    this.logger.log(`Resolving qualified GS1 Digital Link: ${productId}`);
    return this.gs1Service.getProduct(productId);
  }
} 