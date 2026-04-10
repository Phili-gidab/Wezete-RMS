import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExportsService } from './exports.service';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ExportsService],
})
export class ReportsModule {}
