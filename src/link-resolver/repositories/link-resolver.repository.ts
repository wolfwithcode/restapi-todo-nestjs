import { Injectable } from '@nestjs/common';
import {
  IRepositoryProvider,
  SaveParams,
} from '../../common/interfaces/repository.interface';
import { LinkResolver } from '../entities/link-resolver.entity';

/**
 * Link Resolver Repository
 *
 * Implements the IRepositoryProvider interface for the Link Resolver entity.
 * This repository is responsible for storing and retrieving link resolver data.
 */
@Injectable()
export class LinkResolverRepository implements IRepositoryProvider {
  // Placeholder for actual database/storage implementation
  private items: Record<string, LinkResolver> = {};

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
   * Saves a Link Resolver entity
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

    this.items[linkResolver.id] = linkResolver;
  }

  /**
   * Retrieves a single Link Resolver by ID
   */
  async one<T>(id: string): Promise<T | null> {
    return (this.items[id] as unknown as T) || null;
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
   */
  async all<T>(filter?: any): Promise<T[]> {
    let result = Object.values(this.items) as unknown as T[];

    if (filter) {
      result = result.filter((item) => {
        const linkResolver = item as unknown as LinkResolver;

        // Apply filters
        for (const [key, value] of Object.entries(filter)) {
          if (linkResolver[key] !== value) {
            return false;
          }
        }

        return true;
      });
    }

    return result;
  }

  /**
   * Deletes a Link Resolver by ID
   */
  async delete(id: string): Promise<void> {
    delete this.items[id];
  }

  /**
   * Generate link header text from resolver data
   * This is a simplified implementation - a real one would be more complex
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
