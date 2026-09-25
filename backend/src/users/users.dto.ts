import { IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(11, { message: 'Insert a valid phone number' })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;
  // no `role` here: an undecorated field makes forbidNonWhitelisted reject
  // every request, and public sign-up must never pick its own role anyway
}
