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

    this.gateway.emitToRoom('admin', 'lowStock', payload);
    this.gateway.emitToRoom('inventory', 'lowStock', payload);

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
    this.gateway.emitToRoom('waiter_station', 'orderReady', payload);
    this.logger.log(`orderReady → waiter_station: ${orderNumber}`);
  }

  async notifyApprovalNeeded(approvalId: string, type: string, reason: string) {
    const payload = {
      type: NotificationType.APPROVAL_NEEDED,
      title: `Approval Required: ${type}`,
      message: reason,
      approvalId,
    };
    this.gateway.emitToRoom('admin', 'approvalNeeded', payload);
    this.logger.log(`approvalNeeded → admin: ${approvalId}`);
  }

  async notifyPaymentReceived(orderNumber: string, amount: number, method: string) {
    const payload = {
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Payment Received',
      message: `${method} payment of ${amount} for order ${orderNumber}`,
    };
    this.gateway.emitToRoom('waiter_station', 'paymentReceived', payload);
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
    this.gateway.emitToRoom('waiter_station', 'orderStatusChanged', payload);
    // TODO: emit to specific customer via user-targeted room when customer WS is implemented
    this.logger.log(`orderStatusChanged → waiter_station: ${orderNumber} → ${status}`);
  }

  /**
   * Notify on payment failure (Cashier + Manager).
   * Proposal Section 9: "Payment Failed → Cashier, Manager → Immediate"
   */
  async notifyPaymentFailed(orderNumber: string, reason: string) {
    const payload = {
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      message: `Payment failed for order ${orderNumber}: ${reason}`,
      orderNumber,
    };
    this.gateway.emitToRoom('waiter_station', 'paymentFailed', payload); // cashier in waiter_station room
    this.gateway.emitToRoom('admin', 'paymentFailed', payload);
    this.logger.log(`paymentFailed → cashier, admin: ${orderNumber}`);
  }

  /**
   * Notify when item goes out-of-stock (Waiter + Manager).
   * Proposal Section 9: "Out-of-Stock Item → Waiter, Manager → Immediate; item auto-hidden"
   */
  async notifyOutOfStock(itemName: string) {
    const payload = {
      type: 'OUT_OF_STOCK',
      title: 'Item Out of Stock',
      message: `${itemName} is now out of stock and has been hidden from the menu`,
      itemName,
    };
    this.gateway.emitToRoom('waiter_station', 'outOfStock', payload);
    this.gateway.emitToRoom('admin', 'outOfStock', payload);
    this.logger.log(`outOfStock → waiter, admin: ${itemName}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Private                                                             */
  /* ------------------------------------------------------------------ */

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
