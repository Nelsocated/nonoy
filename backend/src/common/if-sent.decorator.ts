import { ValidateIf } from 'class-validator';

/**
 * Like @IsOptional for PATCH bodies, but only a left-out field is skipped:
 * `null` is still validated, so a required column can't be set to null
 * (which Prisma would turn into a 500).
 */
export const IfSent = () => ValidateIf((_o, value) => value !== undefined);
