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

// What the service records: workerId always comes from the authenticated
// user (or the calling service), never from the request body
export type RecordActivityLogInput = CreateActivityLogDto & { workerId: string };
