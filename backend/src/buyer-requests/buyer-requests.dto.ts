import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
// an empty place means "no place", not an empty string
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

// the owner can fix what the worker typed when approving
export class ApproveBuyerRequestDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a name' })
  @MaxLength(100)
  name: string;

  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string | null;
}

// from /sync: the phone makes the id, so resending the same request is safe
export class CreateBuyerRequestDto extends ApproveBuyerRequestDto {
  @IsUUID()
  id: string;

  @IsDateString()
  createdAtClient: string;
}

export class MergeBuyerRequestDto {
  @IsUUID()
  buyerId: string;
}
