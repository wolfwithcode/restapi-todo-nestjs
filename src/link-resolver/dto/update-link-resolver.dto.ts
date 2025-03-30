import { IsString, IsBoolean, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Linkset, Response } from '../entities/link-resolver.entity';
import { ResponseDto } from './create-link-resolver.dto';

/**
 * Data Transfer Object for updating a Link Resolver entry
 * All fields are optional for partial updates
 */
export class UpdateLinkResolverDto {
  @IsString()
  @IsOptional()
  namespace?: string;

  @IsString()
  @IsOptional()
  identificationKeyType?: string;

  @IsString()
  @IsOptional()
  identificationKey?: string;

  @IsString()
  @IsOptional()
  itemDescription?: string;

  @IsString()
  @IsOptional()
  qualifierPath?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  linkset?: Linkset;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ResponseDto)
  responses?: Response[];
} 