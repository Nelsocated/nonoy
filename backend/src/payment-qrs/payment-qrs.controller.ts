import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { CreatePaymentQrDto, UpdatePaymentQrDto } from './payment-qrs.dto.js';
import { PaymentQrsService } from './payment-qrs.service.js';

@Controller('payment-qrs')
export class PaymentQrsController {
  constructor(private paymentQrsService: PaymentQrsService) {}

  // any signed-in role: phones pull these to show them offline
  @Get()
  list() {
    return this.paymentQrsService.list();
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post()
  create(@Body() dto: CreatePaymentQrDto) {
    return this.paymentQrsService.create(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentQrDto,
  ) {
    return this.paymentQrsService.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentQrsService.remove(id);
  }
}
