// sales/dto/create-sale.dto.ts
import {
  IsUUID,
  IsOptional,
  IsInt,
  IsPositive,
  IsDateString,
  IsEnum,
  ValidateIf,
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

  // price actually charged, and the owner's price the phone had; optional so
  // older app versions keep syncing (amount is then taken as-is). An owner
  // price without the charged price would skip the kilos × price check.
  @ValidateIf(
    (o: CreateSaleDto) =>
      o.pricePerKilo !== undefined || o.listPricePerKilo !== undefined,
  )
  @IsDecimalAmount()
  pricePerKilo?: string;

  @IsOptional()
  @IsDecimalAmount()
  listPricePerKilo?: string;

  // optional so older app versions keep syncing; defaults to CASH
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsDateString()
  createdAtClient: string;
}
