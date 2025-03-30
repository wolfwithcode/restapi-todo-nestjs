import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { LinkResolverService } from '../link-resolver.service';

@Injectable()
@Command({
  name: 'save-sample',
  description: 'Save sample link resolver data to MinIO',
})
export class SaveSampleDataCommand extends CommandRunner {
  constructor(private readonly linkResolverService: LinkResolverService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Saving sample link resolver data to MinIO...');

    const sampleData = {
      id: 'gs1/01/12345678901234/10/123456789012345678902.json',
      createdAt: '2024-09-02T06:19:58.783Z',
      linkset: {
        anchor:
          'http://localhost:3000/gs1/01/12345678901234/10/123456789012345678902',
        'http://localhost:3000/voc/certificationInfo': [
          {
            href: 'https://example.com',
            title: 'Certification Information',
            type: 'application/json',
            hreflang: ['en'],
            'title*': [{ value: 'Certification Information', language: 'en' }],
          },
        ],
      },
      linkHeaderText: 
        '<https://example.com>; rel="gs1:certificationInfo"; type="application/json"; hreflang="en"; title="Certification Information", <http://localhost:3000/gs1/01/12345678901234/10/123456789012345678902>; rel="owl:sameAs"',
      namespace: 'gs1',
      identificationKeyType: 'gtin',
      identificationKey: '12345678901234',
      itemDescription: 'Product description',
      qualifierPath: '/10/123456789012345678902',
      active: true,
      responses: [
        {
          defaultLinkType: true,
          defaultMimeType: true,
          fwqs: false,
          active: true,
          linkType: 'gs1:certificationInfo',
          title: 'Certification Information',
          targetUrl: 'https://example.com',
          mimeType: 'application/json',
          ianaLanguage: 'en',
          context: 'au',
          defaultContext: true,
          defaultIanaLanguage: true,
        },
      ],
    };

    try {
      await this.linkResolverService.create(sampleData);
      console.log('Sample data saved successfully!');
      console.log(`ID: ${sampleData.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to save sample data:', errorMessage);
    }
  }
} 