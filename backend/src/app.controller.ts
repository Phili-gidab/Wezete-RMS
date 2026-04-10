import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  private readonly startedAt = new Date();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getInfo() {
    return {
      name: 'Wezete RMS API',
      version: '1.0.0',
      status: 'running',
    };
  }

  @Get('health')
  @SkipThrottle()
  async health() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      uptime: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
