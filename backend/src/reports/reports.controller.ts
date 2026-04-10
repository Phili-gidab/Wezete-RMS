import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_LEVEL.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  salesSummary(@Query() query: ReportQueryDto) {
    return this.reportsService.salesSummary(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
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

  @Get('audit')
  auditReport(@Query() query: ReportQueryDto) {
    return this.reportsService.auditReport(
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }
}
