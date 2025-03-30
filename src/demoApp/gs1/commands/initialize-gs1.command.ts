import { Command, CommandRunner } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { GS1ResolverService } from '../gs1-resolver.service';

@Command({
  name: 'initialize-gs1',
  description: 'Initialize GS1 identity resolver with sample data',
})
@Injectable()
export class InitializeGS1Command extends CommandRunner {
  private readonly logger = new Logger(InitializeGS1Command.name);

  constructor(private readonly gs1Service: GS1ResolverService) {
    super();
  }

  async run(): Promise<void> {
    try {
      this.logger.log('Initializing GS1 identity resolver structure...');
      const initialized = await this.gs1Service.initialize();

      if (!initialized) {
        this.logger.error('Failed to initialize GS1 structure');
        return;
      }

      this.logger.log('GS1 structure initialized. Adding sample data...');

      // Add sample company
      const sampleCompanyId = 'company-12345';
      const sampleCompany = {
        name: 'Sample Manufacturing Co.',
        address: '123 Industry Way, Manufacturing City',
        contactEmail: 'info@samplemanufacturing.com',
        website: 'https://www.samplemanufacturing.com',
        gs1MembershipId: 'GS1-12345-XYZ',
      };

      await this.gs1Service.upsertCompany(sampleCompanyId, sampleCompany);
      this.logger.log(`Added sample company: ${sampleCompanyId}`);

      // Add sample products with GS1 Digital Link format IDs
      const sampleProducts = [
        {
          id: '01/12345678901234', // GTIN format
          name: 'Organic Apple Juice',
          description: 'Pure organic apple juice, 100% natural ingredients',
          companyId: sampleCompanyId,
          category: 'Beverages',
          attributes: {
            organic: true,
            servingSize: '250ml',
            ingredients: ['organic apple juice', 'vitamin c'],
          },
        },
        {
          id: '01/12345678901235/10/ABC123', // GTIN with batch/lot
          name: 'Whole Grain Bread',
          description: 'Nutritious whole grain bread, freshly baked',
          companyId: sampleCompanyId,
          category: 'Bakery',
          attributes: {
            wholeGrain: true,
            weight: '500g',
            ingredients: ['whole grain flour', 'water', 'salt', 'yeast'],
          },
        },
        {
          id: '01/12345678901236/21/SERIAL9876', // GTIN with serial
          name: 'Premium Coffee Maker',
          description: 'Smart coffee maker with programmable features',
          companyId: sampleCompanyId,
          category: 'Appliances',
          attributes: {
            powerConsumption: '1200W',
            warranty: '2 years',
            color: 'stainless steel',
            dimensions: '30x25x40cm',
          },
        },
      ];

      for (const product of sampleProducts) {
        await this.gs1Service.upsertProduct(product.id, product);
        this.logger.log(`Added sample product: ${product.id}`);

        // Add a sample certificate to the last product
        if (product.id === '01/12345678901236/21/SERIAL9876') {
          const sampleCertificate = {
            id: 'cert-123456',
            name: 'Energy Efficiency Certificate',
            issuer: 'Energy Rating Authority',
            issuedDate: '2023-01-15',
            expiryDate: '2025-01-15',
            rating: 'A+',
            documentUrl: 'https://example.com/certificates/energy-123456.pdf',
          };

          await this.gs1Service.addProductCertificate(
            product.id,
            sampleCertificate,
          );
          this.logger.log(`Added sample certificate to product: ${product.id}`);
        }
      }

      this.logger.log('Sample data initialization completed successfully!');
      this.logger.log('GS1 identity resolver is ready for use.');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to initialize GS1 with sample data: ${errorMessage}`,
      );
    }
  }
}
