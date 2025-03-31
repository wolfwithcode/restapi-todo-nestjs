import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IRepositoryProvider } from '../../common/interfaces/repository.interface';
import { LinkResolver } from './entities/link-resolver.entity';
import { CreateLinkResolverDto } from './dto/create-link-resolver.dto';
import { UpdateLinkResolverDto } from './dto/update-link-resolver.dto';

@Injectable()
export class LinkResolverService {
  constructor(
    @Inject('LINK_RESOLVER_REPOSITORY')
    private readonly linkResolverRepository: IRepositoryProvider,
  ) {}

  /**
   * Creates a new Link Resolver
   */
  async create(
    createLinkResolverDto: CreateLinkResolverDto,
  ): Promise<LinkResolver> {
    const linkResolver = new LinkResolver({
      ...createLinkResolverDto,
      createdAt: new Date(),
    });

    // Generate the ID if repository provides this method
    if ('generateId' in this.linkResolverRepository) {
      linkResolver.id = (this.linkResolverRepository as any).generateId(
        linkResolver.namespace,
        linkResolver.identificationKeyType,
        linkResolver.identificationKey,
        linkResolver.qualifierPath || '',
      );
    }

    await this.linkResolverRepository.save(linkResolver);
    return linkResolver;
  }

  /**
   * Finds all Link Resolvers, optionally filtered
   */
  async findAll(filter?: Partial<LinkResolver>): Promise<LinkResolver[]> {
    return this.linkResolverRepository.all<LinkResolver>(filter);
  }

  /**
   * Finds a Link Resolver by ID
   */
  async findOne(id: string): Promise<LinkResolver> {
    const linkResolver = await this.linkResolverRepository.one<LinkResolver>(
      id,
    );
    if (!linkResolver) {
      throw new NotFoundException(`Link Resolver with ID "${id}" not found`);
    }
    return linkResolver;
  }

  /**
   * Finds a Link Resolver by its components
   */
  async findByComponents(
    namespace: string,
    identificationKeyType: string,
    identificationKey: string,
    qualifierPath = '',
  ): Promise<LinkResolver> {
    // Use repository's getByComponents method if available
    if ('getByComponents' in this.linkResolverRepository) {
      const linkResolver = await (
        this.linkResolverRepository as any
      ).getByComponents(
        namespace,
        identificationKeyType,
        identificationKey,
        qualifierPath,
      );

      if (!linkResolver) {
        throw new NotFoundException(`Link Resolver not found`);
      }

      return linkResolver;
    }

    // Otherwise, generate ID and use the one method
    let id: string;

    if ('generateId' in this.linkResolverRepository) {
      id = (this.linkResolverRepository as any).generateId(
        namespace,
        identificationKeyType,
        identificationKey,
        qualifierPath,
      );
    } else {
      // Use a default ID format if the repository doesn't provide a generator
      id = `${namespace}/${identificationKeyType}/${identificationKey}${qualifierPath}`;
    }

    return this.findOne(id);
  }

  /**
   * Updates a Link Resolver
   */
  async update(
    id: string,
    updateLinkResolverDto: UpdateLinkResolverDto,
  ): Promise<LinkResolver> {
    const linkResolver = await this.findOne(id);

    // Merge updates
    Object.assign(linkResolver, updateLinkResolverDto);

    // Save the updated resolver
    await this.linkResolverRepository.save(linkResolver);

    return linkResolver;
  }

  /**
   * Removes a Link Resolver
   */
  async remove(id: string): Promise<void> {
    // Verify the resolver exists before deletion
    await this.findOne(id);
    await this.linkResolverRepository.delete(id);
  }

  /**
   * Resolves a link by its components and returns appropriate responses
   */
  async resolveLink(
    namespace: string,
    identificationKeyType: string,
    identificationKey: string,
    qualifierPath = '',
    context?: string,
    linkType?: string,
    mimeType?: string,
    language?: string,
  ): Promise<{
    resolver: LinkResolver;
    response: any;
    linkHeaderText: string;
  }> {
    // Find the resolver
    const resolver = await this.findByComponents(
      namespace,
      identificationKeyType,
      identificationKey,
      qualifierPath,
    );

    if (!resolver.active) {
      throw new NotFoundException('Link Resolver is not active');
    }

    // Filter responses
    let matchingResponses = [...resolver.responses];

    // Apply filters
    if (context) {
      matchingResponses = matchingResponses.filter(
        (r) => r.context === context || (r.defaultContext && !context),
      );
    } else {
      matchingResponses = matchingResponses.filter((r) => r.defaultContext);
    }

    if (linkType) {
      matchingResponses = matchingResponses.filter(
        (r) => r.linkType === linkType || (r.defaultLinkType && !linkType),
      );
    } else {
      matchingResponses = matchingResponses.filter((r) => r.defaultLinkType);
    }

    if (mimeType) {
      matchingResponses = matchingResponses.filter(
        (r) => r.mimeType === mimeType || (r.defaultMimeType && !mimeType),
      );
    } else {
      matchingResponses = matchingResponses.filter((r) => r.defaultMimeType);
    }

    if (language) {
      matchingResponses = matchingResponses.filter(
        (r) =>
          r.ianaLanguage === language || (r.defaultIanaLanguage && !language),
      );
    } else {
      matchingResponses = matchingResponses.filter(
        (r) => r.defaultIanaLanguage,
      );
    }

    // Get the best response
    const response = matchingResponses.length > 0 ? matchingResponses[0] : null;

    if (!response) {
      throw new NotFoundException('No matching response found');
    }

    return {
      resolver,
      response,
      linkHeaderText: resolver.linkHeaderText,
    };
  }
}
