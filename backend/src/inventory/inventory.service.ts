import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInventoryDto) {
    return this.prisma.inventoryItem.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        quantity: new Prisma.Decimal(dto.quantity),
        reorderLevel: new Prisma.Decimal(dto.reorderLevel),
        costPerUnit: new Prisma.Decimal(dto.costPerUnit),
      },
    });
  }

  async findAll() {
    return this.prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: { menuItems: true },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with id "${id}" not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateInventoryDto) {
    await this.findOne(id);

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.quantity !== undefined && {
          quantity: new Prisma.Decimal(dto.quantity),
        }),
        ...(dto.reorderLevel !== undefined && {
          reorderLevel: new Prisma.Decimal(dto.reorderLevel),
        }),
        ...(dto.costPerUnit !== undefined && {
          costPerUnit: new Prisma.Decimal(dto.costPerUnit),
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  /**
   * Deduct stock for a given inventory item.
   * Throws if resulting quantity would be negative.
   */
  async deductStock(itemId: string, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Deduction quantity must be positive');
    }

    const item = await this.findOne(itemId);
    const currentQty = item.quantity.toNumber();

    if (currentQty < quantity) {
      throw new BadRequestException(
        `Insufficient stock for "${item.name}". Available: ${currentQty}, requested: ${quantity}`,
      );
    }

    return this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        quantity: new Prisma.Decimal(currentQty - quantity),
      },
    });
  }

  /**
   * Returns all items where current quantity <= reorder level.
   */
  async getLowStockItems() {
    return this.prisma.$queryRaw<any[]>(
      Prisma.sql`
        SELECT * FROM inventory_items
        WHERE quantity <= reorder_level
        ORDER BY (quantity - reorder_level) ASC
      `,
    );
  }
}
