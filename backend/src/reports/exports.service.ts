import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { ReportsService } from './reports.service';

@Injectable()
export class ExportsService {
  constructor(private readonly reports: ReportsService) {}

  async salesPdf(from?: Date, to?: Date): Promise<Buffer> {
    const sales = await this.reports.salesSummary(from, to);
    const topItems = await this.reports.topSellingItems(from, to);

    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).fillColor('#0A3D39').text('Wezete RMS — Sales Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(
        `Generated: ${new Date().toLocaleString()}${from ? ` | From: ${from.toLocaleDateString()}` : ''}${to ? ` | To: ${to.toLocaleDateString()}` : ''}`,
        { align: 'center' },
      );
      doc.moveDown(1.5);

      // Summary
      doc.fontSize(14).fillColor('#0A3D39').text('Summary');
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#333');
      doc.text(`Total Revenue: ETB ${sales.totalRevenue.toFixed(2)}`);
      doc.text(`Total Orders: ${sales.totalOrders}`);
      doc.text(`Average Order Value: ETB ${sales.avgOrderValue.toFixed(2)}`);
      doc.moveDown(0.5);
      doc.text(`Cash: ${sales.byMethod.cash.count} orders — ETB ${sales.byMethod.cash.total.toFixed(2)}`);
      doc.text(`Chapa: ${sales.byMethod.chapa.count} orders — ETB ${sales.byMethod.chapa.total.toFixed(2)}`);
      doc.moveDown(1.5);

      // Top items
      if (topItems.length > 0) {
        doc.fontSize(14).fillColor('#0A3D39').text('Top Selling Items');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333');
        topItems.forEach((item, i) => {
          doc.text(
            `${i + 1}. ${item.menuItem?.name ?? 'Unknown'} — Qty: ${item.totalQuantitySold}, Revenue: ETB ${item.totalRevenue.toFixed(2)}`,
          );
        });
      }

      doc.end();
    });
  }

  async salesExcel(from?: Date, to?: Date): Promise<Buffer> {
    const sales = await this.reports.salesSummary(from, to);
    const topItems = await this.reports.topSellingItems(from, to);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Wezete RMS';

    // Summary sheet
    const summary = workbook.addWorksheet('Summary');
    summary.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    summary.addRow({ metric: 'Total Revenue (ETB)', value: sales.totalRevenue });
    summary.addRow({ metric: 'Total Orders', value: sales.totalOrders });
    summary.addRow({ metric: 'Avg Order Value (ETB)', value: sales.avgOrderValue });
    summary.addRow({ metric: 'Cash Orders', value: sales.byMethod.cash.count });
    summary.addRow({ metric: 'Cash Total (ETB)', value: sales.byMethod.cash.total });
    summary.addRow({ metric: 'Chapa Orders', value: sales.byMethod.chapa.count });
    summary.addRow({ metric: 'Chapa Total (ETB)', value: sales.byMethod.chapa.total });

    // Top items sheet
    const itemsSheet = workbook.addWorksheet('Top Items');
    itemsSheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Qty Sold', key: 'qty', width: 12 },
      { header: 'Revenue (ETB)', key: 'revenue', width: 15 },
    ];
    topItems.forEach((item, i) => {
      itemsSheet.addRow({
        rank: i + 1,
        item: item.menuItem?.name ?? 'Unknown',
        qty: item.totalQuantitySold,
        revenue: item.totalRevenue,
      });
    });

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async inventoryExcel(): Promise<Buffer> {
    const items = await this.reports.inventoryReport();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory');
    sheet.columns = [
      { header: 'Item', key: 'name', width: 25 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Reorder Level', key: 'reorderLevel', width: 14 },
      { header: 'Cost/Unit (ETB)', key: 'costPerUnit', width: 15 },
      { header: 'Stock Value (ETB)', key: 'stockValue', width: 16 },
      { header: 'Low Stock', key: 'isLow', width: 10 },
    ];
    items.forEach((item: any) => {
      sheet.addRow({ ...item, isLow: item.isLow ? 'YES' : 'No' });
    });

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}
