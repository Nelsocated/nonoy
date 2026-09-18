// sales/dto/create-sale.dto.ts
import {
  IsUUID,
  IsOptional,
  IsInt,
  IsPositive,
  IsNumberString,
  IsDateString,
} from 'class-validator';

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

  @IsNumberString()
  totalKilo: string;

  @IsNumberString()
  amount: string;

  @IsDateString()
  createdAtClient: string;
}
