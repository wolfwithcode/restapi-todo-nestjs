import { IsString, IsBoolean, IsOptional, IsArray, IsObject, IsISO8601, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Linkset, Response } from '../entities/link-resolver.entity';

/**
 * Data Transfer Object for creating a Link Resolver entry
 */
export class CreateLinkResolverDto {
  @IsString()
  namespace: string;

  @IsString()
  identificationKeyType: string;

  @IsString()
  identificationKey: string;

  @IsString()
  @IsOptional()
  itemDescription?: string;

  @IsString()
  @IsOptional()
  qualifierPath?: string;

  @IsBoolean()
  active: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => Object) // We can't directly validate Linkset due to dynamic keys
  linkset: Linkset;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponseDto)
  responses: Response[];
}

export class ResponseDto implements Response {
  @IsBoolean()
  defaultLinkType: boolean;

  @IsBoolean()
  defaultMimeType: boolean;

  @IsBoolean()
  fwqs: boolean;

  @IsBoolean()
  active: boolean;

  @IsString()
  linkType: string;

  @IsString()
  title: string;

  @IsString()
  targetUrl: string;

  @IsString()
  mimeType: string;

  @IsString()
  ianaLanguage: string;

  @IsString()
  context: string;

  @IsBoolean()
  defaultContext: boolean;

  @IsBoolean()
  defaultIanaLanguage: boolean;
} 