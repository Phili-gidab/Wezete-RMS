import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async salesSummary(from?: Date, to?: Date) {
    const dateFilter = this.buildDateFilter(from, to);

    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETE,
        ...dateFilter,
      },
      include: { payment: true },
    });

    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const cashOrders = orders.filter(
      (o) => o.payment?.method === 'CASH',
    );
    const chapaOrders = orders.filter(
      (o) => o.payment?.method === 'CHAPA',
    );

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      byMethod: {
        cash: {
          count: cashOrders.length,
          total: Math.round(
            cashOrders.reduce((s, o) => s + Number(o.total), 0) * 100,
          ) / 100,
        },
        chapa: {
          count: chapaOrders.length,
          total: Math.round(
            chapaOrders.reduce((s, o) => s + Number(o.total), 0) * 100,
          ) / 100,
        },
      },
    };
  }

  async topSellingItems(from?: Date, to?: Date, limit = 10) {
    const dateFilter = this.buildDateFilter(from, to);

    const items = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          status: OrderStatus.COMPLETE,
          ...dateFilter,
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) } },
      select: { id: true, name: true, price: true },
    });

    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    return items.map((item) => ({
      menuItem: menuMap.get(item.menuItemId),
      totalQuantitySold: item._sum.quantity,
      totalRevenue: Number(item._sum.totalPrice),
    }));
  }

  async inventoryReport() {
    const items = await this.prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: Number(item.quantity),
      reorderLevel: Number(item.reorderLevel),
      costPerUnit: Number(item.costPerUnit),
      isLow: Number(item.quantity) <= Number(item.reorderLevel),
      stockValue: Math.round(
        Number(item.quantity) * Number(item.costPerUnit) * 100,
      ) / 100,
    }));
  }

  async paymentReport(from?: Date, to?: Date) {
    const dateFilter = this.buildDateFilter(from, to);

    const payments = await this.prisma.payment.findMany({
      where: dateFilter,
      include: {
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: payments.length,
      totalAmount: 0,
      byMethod: { CASH: { count: 0, total: 0 }, CHAPA: { count: 0, total: 0 } },
      byStatus: { PENDING: 0, SUCCESS: 0, FAILED: 0, REFUNDED: 0 },
    };

    for (const p of payments) {
      const amount = Number(p.amount);
      summary.totalAmount += amount;
      summary.byMethod[p.method].count++;
      summary.byMethod[p.method].total += amount;
      summary.byStatus[p.status]++;
    }

    summary.totalAmount = Math.round(summary.totalAmount * 100) / 100;
    summary.byMethod.CASH.total = Math.round(summary.byMethod.CASH.total * 100) / 100;
    summary.byMethod.CHAPA.total = Math.round(summary.byMethod.CHAPA.total * 100) / 100;

    return {
      summary,
      payments: payments.map((p) => ({
        id: p.id,
        orderNumber: p.order.orderNumber,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        txRef: p.txRef,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    };
  }

  async staffActivity(from?: Date, to?: Date) {
    const dateFilter = this.buildDateFilter(from, to);

    const logs = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: dateFilter,
      _count: { id: true },
    });

    const userIds = logs.map((l) => l.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true, isActive: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return logs
      .map((l) => ({
        user: userMap.get(l.userId),
        actionCount: l._count.id,
      }))
      .sort((a, b) => b.actionCount - a.actionCount);
  }

  async orderStats() {
    const statuses = Object.values(OrderStatus);
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      counts[status] = await this.prisma.order.count({ where: { status } });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await this.prisma.order.count({
      where: { createdAt: { gte: todayStart } },
    });

    return { byStatus: counts, todayOrders };
  }

  async auditReport(from?: Date, to?: Date) {
    return this.prisma.auditLog.findMany({
      where: this.buildDateFilter(from, to),
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  private buildDateFilter(from?: Date, to?: Date) {
    if (!from && !to) return {};
    return {
      createdAt: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    };
  }
}
