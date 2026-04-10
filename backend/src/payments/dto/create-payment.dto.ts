import { IsEnum, IsUUID } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsEnum(PaymentMethod, { message: 'method must be CASH or CHAPA' })
  method: PaymentMethod;
}
