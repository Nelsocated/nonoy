// activity-logs/dto/create-activity-log.dto.ts
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ActionType } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';

export class CreateActivityLogDto {
  @IsUUID()
  clientId: string;

  @IsString()
  workerId: string;

  @IsOptional()
  @IsString()
  tripId?: string;

  @IsEnum(ActionType)
  actionType: ActionType;

  @IsObject()
  payload: Prisma.InputJsonValue;

  @IsDateString()
  createdAtClient: string;
}
