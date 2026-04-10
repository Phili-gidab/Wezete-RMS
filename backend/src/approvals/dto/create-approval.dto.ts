import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { ApprovalType } from '@prisma/client';

export class CreateApprovalDto {
  @IsEnum(ApprovalType)
  type: ApprovalType;

  @IsString()
  orderId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class DecideApprovalDto {
  @IsEnum({ APPROVED: 'APPROVED', REJECTED: 'REJECTED' } as const)
  status: 'APPROVED' | 'REJECTED';
}
