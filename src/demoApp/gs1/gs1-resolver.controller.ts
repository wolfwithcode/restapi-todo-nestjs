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
  Query,
  BadRequestException,
} from '@nestjs/common';
import { GS1ResolverService } from './gs1-resolver.service';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('GS1 Identity Resolver')
@Controller('gs1')
export class GS1ResolverController {
  private readonly logger = new Logger(GS1ResolverController.name);

  constructor(private readonly gs1Service: GS1ResolverService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

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
  @ApiOperation({ summary: 'Verify ETag concurrency control for an entity' })
  @ApiParam({
    name: 'entityType',
    description: 'Entity type (product, company, metadata)',
  })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  async verifyIntegrity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<any> {
    if (!['product', 'company', 'metadata'].includes(entityType)) {
      throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }

    return this.gs1Service.verifyETagConcurrency(entityType, entityId);
  }

  @Get('verify/metadata')
  async verifyMetadataIntegrity() {
    return this.gs1Service.verifyETagConcurrency('metadata', 'system');
  }

  // Products

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get product information by ID' })
  @ApiParam({ name: 'productId', description: 'GS1 Product ID (GTIN)' })
  @ApiQuery({
    name: 'includeETag',
    description: 'Include ETag for concurrency control',
    required: false,
    type: Boolean,
  })
  async getProduct(
    @Param('productId') productId: string,
    @Query('includeETag') includeETag?: string,
  ): Promise<any> {
    const includeETagBool = includeETag === 'true';

    if (includeETagBool) {
      return this.gs1Service.getProductWithETag(productId);
    } else {
      return this.gs1Service.getProduct(productId);
    }
  }

  @Post('products/:productId')
  @ApiOperation({ summary: 'Create or update product information' })
  @ApiParam({ name: 'productId', description: 'GS1 Product ID (GTIN)' })
  async createProduct(
    @Param('productId') productId: string,
    @Body() productData: any,
  ) {
    return this.gs1Service.upsertProduct(productId, productData);
  }

  @Put('products/:productId')
  async updateProduct(
    @Param('productId') productId: string,
    @Body() productData: any,
  ) {
    return this.gs1Service.upsertProduct(productId, productData);
  }

  @Delete('products/:productId')
  async deleteProduct(@Param('productId') productId: string) {
    const success = await this.gs1Service.deleteProduct(productId);
    return { success };
  }

  @Get('products/:productId/history')
  @ApiOperation({ summary: 'Get product history records' })
  @ApiParam({ name: 'productId', description: 'GS1 Product ID (GTIN)' })
  async getProductHistory(@Param('productId') productId: string) {
    return this.gs1Service.getProductHistory(productId);
  }

  // Certificates

  @Get('products/:productId/certificates')
  @ApiOperation({ summary: 'Get product certificates' })
  @ApiParam({ name: 'productId', description: 'GS1 Product ID (GTIN)' })
  async getProductCertificates(@Param('productId') productId: string) {
    return this.gs1Service.getProductCertificates(productId);
  }

  @Get('products/:productId/certificates/:certificateId')
  @ApiOperation({ summary: 'Get a specific product certificate' })
  @ApiParam({ name: 'productId', description: 'GS1 Product ID (GTIN)' })
  @ApiParam({ name: 'certificateId', description: 'Certificate ID' })
  @ApiQuery({
    name: 'includeETag',
    description: 'Include ETag for concurrency control',
    required: false,
    type: Boolean,
  })
  async getProductCertificate(
    @Param('productId') productId: string,
    @Param('certificateId') certificateId: string,
    @Query('includeETag') includeETag?: string,
  ): Promise<any> {
    const includeETagBool = includeETag === 'true';

    if (includeETagBool) {
      return this.gs1Service.getCertificateWithETag(productId, certificateId);
    } else {
      const result = await this.gs1Service.getCertificateWithETag(
        productId,
        certificateId,
      );
      const { _etag, ...data } = result;
      return data;
    }
  }

  @Post('products/:productId/certificates')
  @ApiOperation({ summary: 'Add a certificate to a product' })
  @ApiParam({ name: 'productId', description: 'GS1 Product ID (GTIN)' })
  async addProductCertificate(
    @Param('productId') productId: string,
    @Body() certificateData: any,
  ) {
    return this.gs1Service.addProductCertificate(productId, certificateData);
  }

  // Companies

  @Get('companies/:companyId')
  @ApiOperation({ summary: 'Get company information by ID' })
  @ApiParam({ name: 'companyId', description: 'GS1 Company ID (GLN)' })
  @ApiQuery({
    name: 'includeETag',
    description: 'Include ETag for concurrency control',
    required: false,
    type: Boolean,
  })
  async getCompany(
    @Param('companyId') companyId: string,
    @Query('includeETag') includeETag?: string,
  ): Promise<any> {
    const includeETagBool = includeETag === 'true';

    if (includeETagBool) {
      return this.gs1Service.getCompanyWithETag(companyId);
    } else {
      return this.gs1Service.getCompany(companyId);
    }
  }

  @Post('companies/:companyId')
  @ApiOperation({ summary: 'Create or update company information' })
  @ApiParam({ name: 'companyId', description: 'GS1 Company ID (GLN)' })
  async createCompany(
    @Param('companyId') companyId: string,
    @Body() companyData: any,
  ) {
    return this.gs1Service.upsertCompany(companyId, companyData);
  }

  @Put('companies/:companyId')
  async updateCompany(
    @Param('companyId') companyId: string,
    @Body() companyData: any,
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
    @Param('primaryValue') primaryValue: string,
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
    @Param('qualifierValue') qualifierValue: string,
  ) {
    const productId = `${primaryKey}/${primaryValue}/${qualifierKey}/${qualifierValue}`;
    this.logger.log(`Resolving qualified GS1 Digital Link: ${productId}`);
    return this.gs1Service.getProduct(productId);
  }
}
