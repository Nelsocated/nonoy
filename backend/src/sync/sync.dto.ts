// sync/dto/sync-batch.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateTripDto, EndTripDto } from '../trips/trips.dto.js';
import { CreatePickupDto } from '../pickups/pickups.dto.js';
import { CreateSaleDto } from '../sales/sales.dto.js';
import { CreateRecountDto } from '../recounts/recounts.dto.js';

class EndTripSyncDto extends EndTripDto {
  @IsUUID()
  tripId: string; // needs to identify which trip, unlike the REST version where it's a URL param
}

export class SyncBatchDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTripDto)
  trips?: CreateTripDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EndTripSyncDto)
  tripEndings?: EndTripSyncDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePickupDto)
  pickups?: CreatePickupDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDto)
  sales?: CreateSaleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecountDto)
  recounts?: CreateRecountDto[];
}
