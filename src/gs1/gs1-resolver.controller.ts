import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  NotFoundException,
  Logger
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

  // Products
  
  @Get('products/:productId')
  async getProduct(@Param('productId') productId: string) {
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

  @Post('products/:productId/certificates')
  async addProductCertificate(
    @Param('productId') productId: string,
    @Body() certificateData: any
  ) {
    return this.gs1Service.addProductCertificate(productId, certificateData);
  }

  // Companies
  
  @Get('companies/:companyId')
  async getCompany(@Param('companyId') companyId: string) {
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