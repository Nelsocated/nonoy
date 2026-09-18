// plantations/dto/create-plantation.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional } from 'class-validator';

export class CreatePlantationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdatePlantationDto extends PartialType(CreatePlantationDto) {}
