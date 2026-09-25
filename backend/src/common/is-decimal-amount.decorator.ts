import { Matches } from 'class-validator';

/**
 * A non-negative decimal string with at most 2 decimals, e.g. "140.25", "300", "0".
 * Matches the Decimal(10, 2) columns: 8 integer digits max. Plain @IsNumberString
 * would also let through "-500", "1e5" and "1.23456".
 */
export const IsDecimalAmount = () =>
  Matches(/^\d{1,8}(\.\d{1,2})?$/, {
    message: '$property must be a non-negative number with up to 2 decimals',
  });
