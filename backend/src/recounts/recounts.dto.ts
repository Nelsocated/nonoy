import {
  IsUUID,
  IsInt,
  Min,
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
  @Min(0) // 0 is valid — everything was sold
  countedChicken: number;

  @IsNumberString()
  countedKilo: string;

  @IsDateString()
  createdAtClient: string;
}
