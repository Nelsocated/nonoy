// dto/create-buyer.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBuyerDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a name' })
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBuyerDto extends PartialType(CreateBuyerDto) {}
