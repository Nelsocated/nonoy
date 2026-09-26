// plantations/dto/create-plantation.dto.ts
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { IfSent } from '../common/if-sent.decorator.js';

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

export class UpdatePlantationDto {
  @IfSent()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a name' })
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
