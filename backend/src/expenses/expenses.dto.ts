import {
  IsUUID,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { IsDecimalAmount } from '../common/is-decimal-amount.decorator.js';

export class CreateExpenseDto {
  @IsUUID()
  clientId: string; // offline-generated dedupe key

  @IsUUID()
  activityLogClientId: string;

  // optional — gas bought between trips has no trip
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsDecimalAmount()
  amount: string;

  @IsDateString()
  createdAtClient: string;
}
