import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto, NotificationType } from './dto/create-notification.dto';

/** Category slugs/names that route to the bar station instead of kitchen. */
const BAR_CATEGORIES = ['beverages', 'cocktails', 'drinks', 'bar'];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Generic dispatch                                                    */
  /* ------------------------------------------------------------------ */

  async send(dto: CreateNotificationDto) {
    this.logger.log(
      `[${dto.type}] ${dto.title}: ${dto.message} → ${dto.targetUserId ?? dto.targetRole ?? 'broadcast'}`,
    );

    // Emit over WebSocket to the appropriate room / user
    if (dto.targetRole) {
      const room = this.roleToRoom(dto.targetRole);
      if (room) {
        this.gateway.emitToRoom(room, 'notification', dto);
      }
    }

    return { sent: true, type: dto.type, title: dto.title };
  }

  /* ------------------------------------------------------------------ */
  /*  KDS — new order routing                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Emits a 'newOrder' event to kitchen_station and/or bar_station
   * depending on each item's category.
   */
  async notifyNewOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(`notifyNewOrder: order ${orderId} not found`);
      return;
    }

    const kitchenItems: typeof order.items = [];
    const barItems: typeof order.items = [];

    for (const item of order.items) {
      const slug = item.menuItem.category?.slug?.toLowerCase() ?? '';
      const name = item.menuItem.category?.name?.toLowerCase() ?? '';

      if (BAR_CATEGORIES.includes(slug) || BAR_CATEGORIES.includes(name)) {
        barItems.push(item);
      } else {
        kitchenItems.push(item);
      }
    }

    const basePayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
    };

    if (kitchenItems.length > 0) {
      this.gateway.emitToRoom('kitchen_station', 'newOrder', {
        ...basePayload,
        items: kitchenItems.map((i) => ({
          id: i.id,
          menuItemName: i.menuItem.name,
          quantity: i.quantity,
          customisations: i.customisations,
          dietaryNotes: i.dietaryNotes,
        })),
      });
      this.logger.log(
        `newOrder → kitchen_station (${kitchenItems.length} items) for ${order.orderNumber}`,
      );
    }

    if (barItems.length > 0) {
      this.gateway.emitToRoom('bar_station', 'newOrder', {
        ...basePayload,
        items: barItems.map((i) => ({
          id: i.id,
          menuItemName: i.menuItem.name,
          quantity: i.quantity,
          customisations: i.customisations,
          dietaryNotes: i.dietaryNotes,
        })),
      });
      this.logger.log(
        `newOrder → bar_station (${barItems.length} items) for ${order.orderNumber}`,
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Inventory — low-stock alert                                        */
  /* ------------------------------------------------------------------ */

  async notifyLowStock(itemName: string, currentQty: number, reorderLevel: number) {
    const payload = {
      type: NotificationType.LOW_STOCK,
      title: 'Low Stock Alert',
      message: `${itemName} is at ${currentQty} (reorder level: ${reorderLevel})`,
      itemName,
      currentQty,
      reorderLevel,
    };

    await this.persistAndEmit(['admin', 'inventory'], 'lowStock', payload, 'INVENTORY_MANAGER');
    this.logger.log(`lowStock → admin, inventory: ${itemName}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Existing helpers                                                    */
  /* ------------------------------------------------------------------ */

  async notifyOrderReady(orderNumber: string, tableNumber?: number) {
    const payload = {
      type: NotificationType.ORDER_READY,
      title: 'Order Ready',
      message: `Order ${orderNumber} is ready${tableNumber ? ` for table ${tableNumber}` : ' for pickup'}`,
    };
    await this.persistAndEmit('waiter_station', 'orderReady', payload, 'WAITER');
    this.logger.log(`orderReady → waiter_station: ${orderNumber}`);
  }

  async notifyApprovalNeeded(approvalId: string, type: string, reason: string) {
    const payload = {
      type: NotificationType.APPROVAL_NEEDED,
      title: `Approval Required: ${type}`,
      message: reason,
      approvalId,
    };
    await this.persistAndEmit('admin', 'approvalNeeded', payload, 'ADMIN');
    this.logger.log(`approvalNeeded → admin: ${approvalId}`);
  }

  async notifyPaymentReceived(orderNumber: string, amount: number, method: string) {
    const payload = {
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Payment Received',
      message: `${method} payment of ${amount} for order ${orderNumber}`,
    };
    await this.persistAndEmit('waiter_station', 'paymentReceived', payload, 'CASHIER');
    this.logger.log(`paymentReceived → waiter_station: ${orderNumber}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Missing notifications per proposal audit                            */
  /* ------------------------------------------------------------------ */

  /**
   * Notify on every order status change (Waiter + Customer).
   * Proposal Section 9: "Order Status Changed → Waiter, Customer → Immediate"
   */
  async notifyOrderStatusChanged(
    orderNumber: string,
    status: string,
    tableNumber?: number,
  ) {
    const payload = {
      type: 'ORDER_STATUS_CHANGED',
      title: 'Order Status Updated',
      message: `Order ${orderNumber} is now ${status}`,
      orderNumber,
      status,
      tableNumber,
    };
    await this.persistAndEmit('waiter_station', 'orderStatusChanged', payload, 'WAITER');
    this.logger.log(`orderStatusChanged → waiter_station: ${orderNumber} → ${status}`);
  }

  async notifyPaymentFailed(orderNumber: string, reason: string) {
    const payload = {
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      message: `Payment failed for order ${orderNumber}: ${reason}`,
      orderNumber,
    };
    await this.persistAndEmit(['waiter_station', 'admin'], 'paymentFailed', payload, 'CASHIER');
    this.logger.log(`paymentFailed → cashier, admin: ${orderNumber}`);
  }

  async notifyOutOfStock(itemName: string) {
    const payload = {
      type: 'OUT_OF_STOCK',
      title: 'Item Out of Stock',
      message: `${itemName} is now out of stock and has been hidden from the menu`,
      itemName,
    };
    await this.persistAndEmit(['waiter_station', 'admin'], 'outOfStock', payload, 'WAITER');
    this.logger.log(`outOfStock → waiter, admin: ${itemName}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Notification persistence & retrieval                                */
  /* ------------------------------------------------------------------ */

  /**
   * Get notifications for a user (by role and/or userId).
   */
  async getNotifications(
    userRole: string,
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number },
  ) {
    const { unreadOnly = false, limit = 50, offset = 0 } = options ?? {};

    const roleRoom = this.roleToRoom(userRole);

    return this.prisma.notification.findMany({
      where: {
        AND: [
          unreadOnly ? { isRead: false } : {},
          {
            OR: [
              { recipientId: userId },
              { recipientRole: userRole },
              // Admin sees admin-targeted notifications
              ...(roleRoom === 'admin' ? [{ recipientRole: 'ADMIN' }, { recipientRole: 'SUPER_ADMIN' }] : []),
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Count unread notifications for a user.
   */
  async getUnreadCount(userRole: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        isRead: false,
        OR: [
          { recipientId: userId },
          { recipientRole: userRole },
          ...(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
            ? [{ recipientRole: 'ADMIN' }, { recipientRole: 'SUPER_ADMIN' }]
            : []),
        ],
      },
    });
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userRole: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [
          { recipientId: userId },
          { recipientRole: userRole },
        ],
      },
      data: { isRead: true },
    });
    return { success: true };
  }

  /* ------------------------------------------------------------------ */
  /*  Private                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Persist a notification to the database, then emit via WebSocket.
   */
  private async persistAndEmit(
    room: string | string[],
    event: string,
    payload: { type: string; title: string; message: string; [key: string]: any },
    recipientRole?: string,
    recipientId?: string,
  ) {
    // Persist to DB
    await this.prisma.notification.create({
      data: {
        type: payload.type,
        title: payload.title,
        body: payload.message,
        recipientRole: recipientRole ?? null,
        recipientId: recipientId ?? null,
        metadata: payload,
      },
    }).catch((err) => {
      this.logger.warn(`Failed to persist notification: ${err.message}`);
    });

    // Emit via WebSocket
    const rooms = Array.isArray(room) ? room : [room];
    for (const r of rooms) {
      this.gateway.emitToRoom(r, event, payload);
    }
  }

  private roleToRoom(role: string): string | null {
    const map: Record<string, string> = {
      CHEF: 'kitchen_station',
      BARISTA: 'bar_station',
      WAITER: 'waiter_station',
      ADMIN: 'admin',
      SUPER_ADMIN: 'admin',
      INVENTORY_MANAGER: 'inventory',
      CASHIER: 'waiter_station',
    };
    return map[role] ?? null;
  }
}
