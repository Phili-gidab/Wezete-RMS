import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';

/** Defines the only valid forward transitions for order status. */
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.SERVING, OrderStatus.CANCELLED],
  [OrderStatus.SERVING]: [OrderStatus.BILLING],
  [OrderStatus.BILLING]: [OrderStatus.PAYMENT],
  [OrderStatus.PAYMENT]: [OrderStatus.COMPLETE],
  [OrderStatus.COMPLETE]: [],
  [OrderStatus.CANCELLED]: [],
};

const TAX_RATE = new Prisma.Decimal(0.15);

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Create a new order with items inside a transaction.
   * Auto-generates the order number in the format WZ-YYYYMMDD-NNNN.
   */
  async create(dto: CreateOrderDto, userId: string) {
    const menuItemIds = dto.items.map((item) => item.menuItemId);

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    if (menuItems.length !== menuItemIds.length) {
      const found = new Set(menuItems.map((m) => m.id));
      const missing = menuItemIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Menu items not found: ${missing.join(', ')}`,
      );
    }

    const unavailable = menuItems.filter((m) => !m.isAvailable);
    if (unavailable.length > 0) {
      throw new BadRequestException(
        `Menu items unavailable: ${unavailable.map((m) => m.name).join(', ')}`,
      );
    }

    const priceMap = new Map(
      menuItems.map((m) => [m.id, new Prisma.Decimal(m.price.toString())]),
    );

    // Build order item data and compute subtotal
    let subtotal = new Prisma.Decimal(0);
    const itemsData = dto.items.map((item) => {
      const unitPrice = priceMap.get(item.menuItemId)!;
      const totalPrice = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(totalPrice);

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        customisations: item.customisations ?? Prisma.JsonNull,
        dietaryNotes: item.dietaryNotes ?? Prisma.JsonNull,
      };
    });

    const tax = subtotal.mul(TAX_RATE).toDecimalPlaces(2);
    const total = subtotal.add(tax);

    const order = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.generateOrderNumber(tx);

      return tx.order.create({
        data: {
          orderNumber,
          orderType: dto.orderType,
          tableNumber: dto.tableNumber,
          notes: dto.notes,
          subtotal,
          tax,
          discount: 0,
          total,
          userId,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: { include: { menuItem: true } },
        },
      });
    });

    // Notify kitchen/bar stations about the new order
    this.notifications.notifyNewOrder(order.id).catch((err) => {
      this.logger.error(`Failed to notify new order: ${err.message}`);
    });

    return order;
  }

  /**
   * List orders with optional filters.
   */
  async findAll(filters: {
    status?: OrderStatus;
    userId?: string;
    from?: Date;
    to?: Date;
    orderType?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, userId, from, to, orderType, page = 1, limit = 20 } = filters;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (orderType) where.orderType = orderType;
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: { include: { menuItem: true } },
          user: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single order by ID with items and payment.
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        payment: true,
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  /**
   * Update order status with forward-only transition validation.
   * Triggers side-effects: notifications and inventory deduction.
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { menuItem: true } } },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    const allowed = STATUS_TRANSITIONS[order.status];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}. ` +
          `Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: {
        items: { include: { menuItem: true } },
        payment: true,
      },
    });

    // Fire-and-forget side-effects based on new status
    this.handleStatusSideEffects(updated).catch((err) => {
      this.logger.error(`Status side-effect error for order ${id}: ${err.message}`);
    });

    return updated;
  }

  /**
   * Generate a PDF receipt for a completed order.
   */
  async generateReceipt(id: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        payment: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: [226, 600], margin: 15 }); // ~80mm thermal receipt width
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(14).font('Helvetica-Bold').text('Wezete RMS', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text('The Bar Addis Restaurant & Lounge', { align: 'center' });
      doc.text('Addis Ababa, Ethiopia', { align: 'center' });
      doc.moveDown(0.3);
      doc.text('─'.repeat(30), { align: 'center' });
      doc.moveDown(0.3);

      // Order info
      doc.fontSize(9).font('Helvetica-Bold').text(`Order: ${order.orderNumber}`);
      doc.font('Helvetica').text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
      doc.text(`Type: ${order.orderType.replace('_', ' ')}`);
      if (order.tableNumber) doc.text(`Table: ${order.tableNumber}`);
      if (order.user) doc.text(`Server: ${order.user.firstName} ${order.user.lastName}`);
      doc.moveDown(0.3);
      doc.text('─'.repeat(30), { align: 'center' });
      doc.moveDown(0.3);

      // Items
      doc.font('Helvetica-Bold').fontSize(8);
      order.items.forEach((item) => {
        const name = item.menuItem.name;
        const qty = item.quantity;
        const total = Number(item.totalPrice).toFixed(2);
        doc.font('Helvetica').text(`${qty}x ${name}`, { continued: false });
        doc.text(`   ETB ${total}`, { align: 'right' });
      });

      doc.moveDown(0.3);
      doc.text('─'.repeat(30), { align: 'center' });
      doc.moveDown(0.3);

      // Totals
      doc.fontSize(8);
      doc.text(`Subtotal:    ETB ${Number(order.subtotal).toFixed(2)}`, { align: 'right' });
      doc.text(`Tax (15%):   ETB ${Number(order.tax).toFixed(2)}`, { align: 'right' });
      if (Number(order.discount) > 0) {
        doc.text(`Discount:   -ETB ${Number(order.discount).toFixed(2)}`, { align: 'right' });
      }
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text(`Total: ETB ${Number(order.total).toFixed(2)}`, { align: 'right' });

      // Payment
      if (order.payment) {
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(8);
        doc.text(`Paid: ${order.payment.method} — ${order.payment.status}`, { align: 'center' });
        if (order.payment.paidAt) {
          doc.text(`At: ${new Date(order.payment.paidAt).toLocaleString()}`, { align: 'center' });
        }
      }

      doc.moveDown(0.5);
      doc.fontSize(8).text('Thank you for dining with us!', { align: 'center' });
      doc.text('Wezete Technology', { align: 'center' });

      doc.end();
    });
  }

  // ──────────────── Side-effects ────────────────

  private async handleStatusSideEffects(order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    tableNumber: number | null;
    items: Array<{ menuItemId: string; quantity: number }>;
  }) {
    switch (order.status) {
      case OrderStatus.READY:
        await this.notifications.notifyOrderReady(
          order.orderNumber,
          order.tableNumber ?? undefined,
        );
        break;

      case OrderStatus.COMPLETE:
        await this.deductInventoryForOrder(order.items);
        break;
    }
  }

  /**
   * Deduct inventory for each item in the completed order
   * using the MenuItemInventory mappings.
   */
  private async deductInventoryForOrder(
    items: Array<{ menuItemId: string; quantity: number }>,
  ) {
    // Load all inventory mappings for the menu items in this order
    const menuItemIds = items.map((i) => i.menuItemId);
    const mappings = await this.prisma.menuItemInventory.findMany({
      where: { menuItemId: { in: menuItemIds } },
      include: { inventoryItem: true },
    });

    for (const mapping of mappings) {
      const orderItem = items.find((i) => i.menuItemId === mapping.menuItemId);
      if (!orderItem) continue;

      const totalDeduction = Number(mapping.quantityUsed) * orderItem.quantity;

      try {
        const updated = await this.inventoryService.deductStock(
          mapping.inventoryItemId,
          totalDeduction,
        );

        // Check if item hit low-stock threshold after deduction
        const qty = Number(updated.quantity);
        const reorder = Number(updated.reorderLevel);
        if (qty <= reorder) {
          await this.notifications.notifyLowStock(
            updated.name,
            qty,
            reorder,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Inventory deduction failed for ${mapping.inventoryItem.name}: ${err.message}`,
        );
      }
    }
  }

  // ──────────────── Private helpers ────────────────

  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    const prefix = `WZ-${dateStr}-`;

    const startOfDay = new Date(yyyy, today.getMonth(), today.getDate());
    const endOfDay = new Date(yyyy, today.getMonth(), today.getDate() + 1);

    const count = await tx.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }
}
