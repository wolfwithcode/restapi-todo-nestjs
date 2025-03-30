/**
 * Link Resolver Entity
 *
 * This entity represents the Link Resolver data model used to:
 * 1. Store the link resolver configuration for a specific identifier
 * 2. Store metadata for a specific identifier
 * 3. Store responses (redirects) for a specific identifier
 * 4. Store the link set for a specific identifier
 */

export interface LinksetEntry {
  href: string;
  title?: string;
  type?: string;
  hreflang?: string[];
  'title*'?: { value: string; language: string }[];
}

export interface Linkset {
  anchor: string;
  [key: string]: LinksetEntry[] | string;
}

export interface Response {
  defaultLinkType: boolean;
  defaultMimeType: boolean;
  fwqs: boolean;
  active: boolean;
  linkType: string;
  title: string;
  targetUrl: string;
  mimeType: string;
  ianaLanguage: string;
  context: string;
  defaultContext: boolean;
  defaultIanaLanguage: boolean;
}

export class LinkResolver {
  id: string;
  createdAt: Date;
  linkset: Linkset;
  linkHeaderText: string;
  namespace: string;
  identificationKeyType: string;
  identificationKey: string;
  itemDescription?: string;
  qualifierPath?: string;
  active: boolean;
  responses: Response[];

  // Add index signature to allow dynamic property access
  [key: string]: any;

  constructor(partial: Partial<LinkResolver>) {
    Object.assign(this, partial);
  }
}
