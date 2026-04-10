import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Role, PaymentMethod } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyChapaDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: { id: string; role: number; roleName: string },
  ) {
    // CASH payments require CASHIER role or above
    if (dto.method === PaymentMethod.CASH) {
      if (user.role < ROLE_LEVEL.CASHIER) {
        throw new ForbiddenException(
          'Only CASHIER or above can process cash payments',
        );
      }
    }

    return this.paymentsService.create(dto);
  }

  /**
   * Chapa webhook endpoint — no auth guard.
   * Security is enforced via HMAC-SHA256 signature verification.
   */
  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-chapa-signature') signature: string,
  ) {
    await this.paymentsService.handleWebhook(payload, signature);
    return { received: true };
  }

  @Post('chapa/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  verifyChapaPayment(@Body() dto: VerifyChapaDto) {
    return this.paymentsService.verifyChapaPayment(dto.txRef);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_LEVEL.ADMIN)
  refund(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.refund(id);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  findByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }
}
