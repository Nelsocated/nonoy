// pickups/dto/create-pickup.dto.ts
import {
  IsUUID,
  IsInt,
  IsPositive,
  IsNumberString,
  IsDateString,
} from 'class-validator';

export class CreatePickupDto {
  @IsUUID()
  clientId: string; // offline-generated dedupe key for the pickup itself

  @IsUUID()
  activityLogClientId: string; // separate offline-generated dedupe key for its log entry

  @IsUUID()
  tripId: string;

  @IsUUID()
  plantationId: string;

  @IsInt()
  @IsPositive()
  chickenCount: number;

  @IsNumberString()
  totalKilo: string; // Decimal fields come over the wire as strings — Prisma parses them

  @IsDateString()
  createdAtClient: string;
}
