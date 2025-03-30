import { Injectable, Logger } from '@nestjs/common';
import {
  IRepositoryProvider,
  SaveParams,
} from '../../../common/interfaces/repository.interface';
import { LinkResolver } from '../entities/link-resolver.entity';
import { MinioService } from '../../../storage/minio.service';

/**
 * MinIO Link Resolver Repository
 *
 * Implementation of the IRepositoryProvider interface for the Link Resolver entity
 * using MinIO for storage.
 */
@Injectable()
export class MinioLinkResolverRepository implements IRepositoryProvider {
  private readonly logger = new Logger(MinioLinkResolverRepository.name);

  constructor(private readonly minioService: MinioService) {}

  /**
   * Generates an ID based on parameters
   */
  generateId(
    namespace: string,
    identificationKeyType: string,
    identificationKey: string,
    qualifierPath = '',
  ): string {
    return `${namespace}/${identificationKeyType}/${identificationKey}${qualifierPath}`;
  }

  /**
   * Generates a storage key (file path) for the resolver
   */
  private generateStorageKey(id: string): string {
    // Ensure the ID ends with .json
    if (!id.endsWith('.json')) {
      return `${id}.json`;
    }
    return id;
  }

  /**
   * Saves a Link Resolver entity to MinIO
   */
  async save(data: SaveParams): Promise<void> {
    const linkResolver = data as unknown as LinkResolver;

    // If no ID is provided, generate one
    if (!linkResolver.id) {
      linkResolver.id = this.generateId(
        linkResolver.namespace,
        linkResolver.identificationKeyType,
        linkResolver.identificationKey,
        linkResolver.qualifierPath || '',
      );
    }

    // Set createdAt if not provided
    if (!linkResolver.createdAt) {
      linkResolver.createdAt = new Date();
    }

    // Generate link header text if not provided
    if (!linkResolver.linkHeaderText && linkResolver.responses?.length > 0) {
      linkResolver.linkHeaderText = this.generateLinkHeaderText(linkResolver);
    }

    const storageKey = this.generateStorageKey(linkResolver.id);
    const success = await this.minioService.uploadFile(
      storageKey,
      linkResolver,
    );

    if (!success) {
      this.logger.error(`Failed to save link resolver to MinIO: ${storageKey}`);
      throw new Error(`Failed to save link resolver: ${linkResolver.id}`);
    }
  }

  /**
   * Retrieves a single Link Resolver by ID from MinIO
   */
  async one<T>(id: string): Promise<T | null> {
    const storageKey = this.generateStorageKey(id);
    const result = await this.minioService.getFile(storageKey);

    if (!result) {
      return null;
    }

    return result as unknown as T;
  }

  /**
   * Retrieves a Link Resolver by its components
   */
  async getByComponents(
    namespace: string,
    identificationKeyType: string,
    identificationKey: string,
    qualifierPath = '',
  ): Promise<LinkResolver | null> {
    const id = this.generateId(
      namespace,
      identificationKeyType,
      identificationKey,
      qualifierPath,
    );
    return this.one<LinkResolver>(id);
  }

  /**
   * Retrieves all Link Resolvers, optionally filtered
   * Note: Filtering happens in memory after fetching all files
   */
  async all<T>(filter?: any): Promise<T[]> {
    // List all objects
    const fileKeys = await this.minioService.listFiles();

    // Get all files
    const results: T[] = [];

    for (const key of fileKeys) {
      const item = await this.minioService.getFile(key);
      if (item) {
        results.push(item as unknown as T);
      }
    }

    // Apply filters
    if (filter) {
      return results.filter((item) => {
        const linkResolver = item as unknown as LinkResolver;

        for (const [key, value] of Object.entries(filter)) {
          if (linkResolver[key] !== value) {
            return false;
          }
        }

        return true;
      });
    }

    return results;
  }

  /**
   * Deletes a Link Resolver by ID from MinIO
   */
  async delete(id: string): Promise<void> {
    const storageKey = this.generateStorageKey(id);
    const success = await this.minioService.deleteFile(storageKey);

    if (!success) {
      this.logger.error(
        `Failed to delete link resolver from MinIO: ${storageKey}`,
      );
      throw new Error(`Failed to delete link resolver: ${id}`);
    }
  }

  /**
   * Generate a presigned URL for accessing the resolver file
   */
  async getPresignedUrl(id: string, expiresIn = 3600): Promise<string> {
    const storageKey = this.generateStorageKey(id);
    return this.minioService.getPresignedUrl(storageKey, expiresIn);
  }

  /**
   * Generate link header text from resolver data
   */
  private generateLinkHeaderText(linkResolver: LinkResolver): string {
    const links: string[] = [];

    // Add each response as a link
    for (const response of linkResolver.responses) {
      if (response.active) {
        const link = `<${response.targetUrl}>; rel="${response.linkType}"; type="${response.mimeType}"; hreflang="${response.ianaLanguage}"; title="${response.title}"`;
        links.push(link);
      }
    }

    // Add the sameAs link
    const anchor = linkResolver.linkset?.anchor;
    if (anchor) {
      links.push(`<${anchor}>; rel="owl:sameAs"`);
    }

    return links.join(', ');
  }
}
