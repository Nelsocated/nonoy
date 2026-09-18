import { IsString, MinLength } from 'class-validator';

export class AuthDto {
  @IsString()
  @MinLength(11, { message: 'Insert a valid phone number' })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
