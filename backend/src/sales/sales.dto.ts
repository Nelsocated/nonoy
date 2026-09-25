// sales/dto/create-sale.dto.ts
import {
  IsUUID,
  IsOptional,
  IsInt,
  IsPositive,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '../generated/prisma/enums.js';
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

  // optional so older app versions keep syncing; defaults to CASH
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsDateString()
  createdAtClient: string;
}
