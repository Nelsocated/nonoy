import { IsDecimalAmount } from '../common/is-decimal-amount.decorator.js';

export class CreatePriceDto {
  @IsDecimalAmount()
  pricePerKilo: string;
}
