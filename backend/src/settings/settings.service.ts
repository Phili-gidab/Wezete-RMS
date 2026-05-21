import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SETTINGS: Record<string, string> = {
  taxRate: '15',
  orderPrefix: 'GM',
  currency: 'ETB',
  restaurantName: 'Green Mark RMS',
  restaurantPhone: '',
  restaurantAddress: '',
  chapaEnabled: 'true',
  cashEnabled: 'true',
  largeOrderThreshold: '5000',
};

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Seed defaults if not present
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await this.prisma.setting.upsert({
        where: { key },
        update: {},
        create: { key, value },
      });
    }
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async get(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? DEFAULT_SETTINGS[key] ?? null;
  }

  async update(updates: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(updates)) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    return this.getAll();
  }
}
