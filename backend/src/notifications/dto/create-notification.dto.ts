import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  LOW_STOCK = 'LOW_STOCK',
  ORDER_READY = 'ORDER_READY',
  APPROVAL_NEEDED = 'APPROVAL_NEEDED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
}

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  targetRole?: string;
}
