// plantations/dto/create-plantation.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePlantationDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a name' })
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdatePlantationDto extends PartialType(CreatePlantationDto) {}
