import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApprovalStatus, ApprovalType, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateApprovalDto } from './dto/create-approval.dto';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateApprovalDto, requestedById: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const approval = await this.prisma.approvalRequest.create({
      data: {
        type: dto.type,
        reason: dto.reason,
        metadata: dto.metadata as any ?? undefined,
        orderId: dto.orderId,
        requestedById,
      },
      include: {
        order: { select: { id: true, orderNumber: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      action: `APPROVAL_REQUESTED_${dto.type}`,
      entity: 'ApprovalRequest',
      entityId: approval.id,
      userId: requestedById,
      delta: { type: dto.type, reason: dto.reason, orderId: dto.orderId },
    });

    // Notify admins about the new approval request
    this.notifications
      .notifyApprovalNeeded(approval.id, dto.type, dto.reason)
      .catch(() => {});

    return approval;
  }

  async findAll(status?: ApprovalStatus) {
    return this.prisma.approvalRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        decidedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        order: { include: { items: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        decidedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    return approval;
  }

  async decide(id: string, status: 'APPROVED' | 'REJECTED', decidedById: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Approval request already decided');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: status as ApprovalStatus,
        decidedById,
        decidedAt: new Date(),
      },
      include: {
        order: { select: { id: true, orderNumber: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        decidedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      action: `APPROVAL_${status}`,
      entity: 'ApprovalRequest',
      entityId: id,
      userId: decidedById,
      delta: { type: approval.type, status, orderId: approval.orderId },
    });

    // Execute side-effects when approved
    if (status === 'APPROVED') {
      await this.executeApprovalSideEffect(approval);
    }

    return updated;
  }

  /**
   * Execute side-effects based on approval type.
   */
  private async executeApprovalSideEffect(approval: {
    type: ApprovalType;
    orderId: string;
    metadata: any;
    order: { id: string; subtotal: any; tax: any; total: any };
  }) {
    switch (approval.type) {
      case ApprovalType.DISCOUNT: {
        const discountPercent = approval.metadata?.discountPercent ?? 0;
        const subtotal = new Prisma.Decimal(approval.order.subtotal.toString());
        const discountAmount = subtotal
          .mul(discountPercent)
          .div(100)
          .toDecimalPlaces(2);
        const newTotal = subtotal
          .add(new Prisma.Decimal(approval.order.tax.toString()))
          .sub(discountAmount);

        await this.prisma.order.update({
          where: { id: approval.orderId },
          data: {
            discount: discountAmount,
            total: newTotal.greaterThan(0) ? newTotal : new Prisma.Decimal(0),
          },
        });

        this.logger.log(
          `Discount of ${discountPercent}% applied to order ${approval.orderId}`,
        );
        break;
      }

      case ApprovalType.VOID: {
        // Cancel the order
        await this.prisma.order.update({
          where: { id: approval.orderId },
          data: { status: OrderStatus.CANCELLED },
        });

        this.logger.log(`Order ${approval.orderId} voided (cancelled)`);
        break;
      }

      case ApprovalType.REFUND: {
        // Mark payment as refunded (Chapa refund API call is in payments service)
        const payment = await this.prisma.payment.findUnique({
          where: { orderId: approval.orderId },
        });

        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED' },
          });
        }

        this.logger.log(`Refund approved for order ${approval.orderId}`);
        break;
      }
    }
  }
}
