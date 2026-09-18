import { IsUUID, IsDateString } from 'class-validator';

export class CreateTripDto {
  @IsUUID()
  clientId: string; // offline-generated dedupe key

  @IsDateString()
  startedAt: string;

  @IsDateString()
  createdAtClient: string;
}

export class EndTripDto {
  @IsDateString()
  endedAt: string;
}
