import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';
import { ReportsService } from './reports.service';
import { ExportsService } from './exports.service';
import { ReportQueryDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_LEVEL.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportsService: ExportsService,
  ) {}

  @Get('sales')
  salesSummary(@Query() query: ReportQueryDto) {
    return this.reportsService.salesSummary(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  @Get('sales/export/pdf')
  async salesPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const buffer = await this.exportsService.salesPdf(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=sales-report-${Date.now()}.pdf`,
    });
    res.send(buffer);
  }

  @Get('sales/export/xlsx')
  async salesExcel(@Query() query: ReportQueryDto, @Res() res: Response) {
    const buffer = await this.exportsService.salesExcel(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=sales-report-${Date.now()}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('inventory/export/xlsx')
  @Roles(ROLE_LEVEL.INVENTORY_MANAGER)
  async inventoryExcel(@Res() res: Response) {
    const buffer = await this.exportsService.inventoryExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=inventory-report-${Date.now()}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('top-items')
  topSellingItems(@Query() query: ReportQueryDto) {
    return this.reportsService.topSellingItems(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  @Get('inventory')
  @Roles(ROLE_LEVEL.INVENTORY_MANAGER)
  inventoryReport() {
    return this.reportsService.inventoryReport();
  }

  @Get('payments')
  paymentReport(@Query() query: ReportQueryDto) {
    return this.reportsService.paymentReport(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  @Get('staff-activity')
  staffActivity(@Query() query: ReportQueryDto) {
    return this.reportsService.staffActivity(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  @Get('order-stats')
  orderStats() {
    return this.reportsService.orderStats();
  }

  @Get('audit')
  auditReport(@Query() query: ReportQueryDto) {
    return this.reportsService.auditReport(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }
}
