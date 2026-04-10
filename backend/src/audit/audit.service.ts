import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntry {
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  delta?: object;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        userId: entry.userId,
        delta: entry.delta as any ?? undefined,
        ipAddress: entry.ipAddress,
      },
    });
  }

  async findAll(filters?: {
    entity?: string;
    entityId?: string;
    userId?: string;
    from?: Date;
    to?: Date;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters?.entity && { entity: filters.entity }),
        ...(filters?.entityId && { entityId: filters.entityId }),
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.from || filters?.to
          ? {
              createdAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
