import {
  IsUUID,
  IsInt,
  IsPositive,
  IsNumberString,
  IsDateString,
} from 'class-validator';

export class CreateRecountDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  activityLogClientId: string;

  @IsUUID()
  tripId: string;

  @IsInt()
  @IsPositive()
  countedChicken: number;

  @IsNumberString()
  countedKilo: string;

  @IsDateString()
  createdAtClient: string;
}
