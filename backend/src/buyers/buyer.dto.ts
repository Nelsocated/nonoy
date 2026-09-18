// dto/create-buyer.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional } from 'class-validator';

export class CreateBuyerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBuyerDto extends PartialType(CreateBuyerDto) {}
