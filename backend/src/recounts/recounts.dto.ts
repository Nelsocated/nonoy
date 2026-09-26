import { IsUUID, IsInt, Min, IsDateString } from 'class-validator';
import { IsDecimalAmount } from '../common/is-decimal-amount.decorator.js';

export class CreateRecountDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  activityLogClientId: string;

  @IsUUID()
  tripId: string;

  @IsInt()
  @Min(0) // 0 is valid — everything was sold
  countedChicken: number;

  @IsDecimalAmount()
  countedKilo: string;

  @IsDateString()
  createdAtClient: string;
}
