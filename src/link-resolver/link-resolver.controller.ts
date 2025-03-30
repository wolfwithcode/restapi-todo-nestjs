import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Header,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { LinkResolverService } from './link-resolver.service';
import { CreateLinkResolverDto } from './dto/create-link-resolver.dto';
import { UpdateLinkResolverDto } from './dto/update-link-resolver.dto';
import { LinkResolver } from './entities/link-resolver.entity';

@Controller('link-resolver')
export class LinkResolverController {
  constructor(private readonly linkResolverService: LinkResolverService) {}

  @Post()
  async create(
    @Body() createLinkResolverDto: CreateLinkResolverDto,
  ): Promise<LinkResolver> {
    return this.linkResolverService.create(createLinkResolverDto);
  }

  @Get()
  async findAll(
    @Query('namespace') namespace?: string,
    @Query('identificationKeyType') identificationKeyType?: string,
    @Query('identificationKey') identificationKey?: string,
    @Query('active') active?: boolean,
  ): Promise<LinkResolver[]> {
    const filter: Partial<LinkResolver> = {};

    if (namespace) filter.namespace = namespace;
    if (identificationKeyType)
      filter.identificationKeyType = identificationKeyType;
    if (identificationKey) filter.identificationKey = identificationKey;
    if (active !== undefined) filter.active = active;

    return this.linkResolverService.findAll(filter);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<LinkResolver> {
    return this.linkResolverService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLinkResolverDto: UpdateLinkResolverDto,
  ): Promise<LinkResolver> {
    return this.linkResolverService.update(id, updateLinkResolverDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.linkResolverService.remove(id);
  }

  /**
   * Endpoint to resolve links, either returns the link data or redirects to the target URL
   */
  @Get(':namespace/:identificationKeyType/:identificationKey')
  @Header('Content-Type', 'application/json')
  async resolveLink(
    @Param('namespace') namespace: string,
    @Param('identificationKeyType') identificationKeyType: string,
    @Param('identificationKey') identificationKey: string,
    @Query('qualifierPath') qualifierPath?: string,
    @Query('context') context?: string,
    @Query('linkType') linkType?: string,
    @Query('mimeType') mimeType?: string,
    @Query('language') language?: string,
    @Query('redirect') redirect?: string,
  ): Promise<any> {
    try {
      const result = await this.linkResolverService.resolveLink(
        namespace,
        identificationKeyType,
        identificationKey,
        qualifierPath || '',
        context,
        linkType,
        mimeType,
        language,
      );

      // If redirect query param is true, redirect to the target URL
      if (redirect === 'true' && result.response.targetUrl) {
        return {
          statusCode: HttpStatus.FOUND,
          url: result.response.targetUrl,
        };
      }

      // Otherwise return the response data
      return {
        resolver: result.resolver,
        response: result.response,
        linkHeaderText: result.linkHeaderText,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Failed to resolve link');
    }
  }

  /**
   * Endpoint to resolve links with qualifier path
   */
  @Get(':namespace/:identificationKeyType/:identificationKey/*')
  @Header('Content-Type', 'application/json')
  async resolveLinkWithQualifier(
    @Param('namespace') namespace: string,
    @Param('identificationKeyType') identificationKeyType: string,
    @Param('identificationKey') identificationKey: string,
    @Param('0') qualifierPath: string,
    @Query('context') context?: string,
    @Query('linkType') linkType?: string,
    @Query('mimeType') mimeType?: string,
    @Query('language') language?: string,
    @Query('redirect') redirect?: string,
  ): Promise<any> {
    // Ensure qualifierPath starts with '/'
    if (!qualifierPath.startsWith('/')) {
      qualifierPath = '/' + qualifierPath;
    }

    try {
      const result = await this.linkResolverService.resolveLink(
        namespace,
        identificationKeyType,
        identificationKey,
        qualifierPath,
        context,
        linkType,
        mimeType,
        language,
      );

      // If redirect query param is true, redirect to the target URL
      if (redirect === 'true' && result.response.targetUrl) {
        return {
          statusCode: HttpStatus.FOUND,
          url: result.response.targetUrl,
        };
      }

      // Otherwise return the response data
      return {
        resolver: result.resolver,
        response: result.response,
        linkHeaderText: result.linkHeaderText,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Failed to resolve link');
    }
  }
}
