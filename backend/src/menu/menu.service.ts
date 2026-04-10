import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateCategoryDto, UpdateMenuItemDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────── Category ──────────────────────────

  createCategory(dto: CreateCategoryDto) {
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  findAllCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { menuItems: { where: { isAvailable: true } } },
    });
  }

  async findOneCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { menuItems: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.findOneCategory(id);

    const data: Record<string, unknown> = { ...dto };

    if (dto.name) {
      data.slug = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    return this.prisma.category.update({ where: { id }, data });
  }

  async removeCategory(id: string) {
    await this.findOneCategory(id);
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ────────────────────────── MenuItem ──────────────────────────

  async createMenuItem(dto: CreateMenuItemDto) {
    const { inventoryItems, ...rest } = dto;

    return this.prisma.menuItem.create({
      data: {
        ...rest,
        inventoryDeductions: inventoryItems?.length
          ? {
              create: inventoryItems.map((item) => ({
                inventoryItemId: item.inventoryItemId,
                quantityUsed: item.quantityUsed,
              })),
            }
          : undefined,
      },
      include: { category: true, inventoryDeductions: true },
    });
  }

  findAllMenuItems() {
    return this.prisma.menuItem.findMany({
      where: { isAvailable: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneMenuItem(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { category: true, inventoryDeductions: true },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
    await this.findOneMenuItem(id);

    const { inventoryItems, ...rest } = dto;

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...rest,
        inventoryDeductions: inventoryItems
          ? {
              deleteMany: {},
              create: inventoryItems.map((item) => ({
                inventoryItemId: item.inventoryItemId,
                quantityUsed: item.quantityUsed,
              })),
            }
          : undefined,
      },
      include: { category: true, inventoryDeductions: true },
    });
  }

  async removeMenuItem(id: string) {
    await this.findOneMenuItem(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: false },
    });
  }
}
