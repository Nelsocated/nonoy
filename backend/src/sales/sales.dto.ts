// sales/dto/create-sale.dto.ts
import {
  IsUUID,
  IsOptional,
  IsInt,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { IsDecimalAmount } from '../common/is-decimal-amount.decorator.js';

export class CreateSaleDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  activityLogClientId: string;

  @IsUUID()
  tripId: string;

  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @IsInt()
  @IsPositive()
  chickenCount: number;

  @IsDecimalAmount()
  totalKilo: string;

  @IsDecimalAmount()
  amount: string;

  @IsDateString()
  createdAtClient: string;
}
