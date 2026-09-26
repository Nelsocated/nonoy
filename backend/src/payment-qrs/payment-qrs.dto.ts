import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePaymentQrDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a label' })
  @MaxLength(40)
  label: string;

  // the text inside the QR (read from the owner's screenshot in the browser)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  payload: string;
}

export class UpdatePaymentQrDto extends PartialType(CreatePaymentQrDto) {}
