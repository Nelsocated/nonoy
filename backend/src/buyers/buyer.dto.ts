// dto/create-buyer.dto.ts
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { IfSent } from '../common/if-sent.decorator.js';

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

export class UpdateBuyerDto {
  @IfSent()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a name' })
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
