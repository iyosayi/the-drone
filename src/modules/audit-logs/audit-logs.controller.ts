import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditLogService } from './audit-logs.service';

@Controller('drone-battery')
export class AuditLogsController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get('check')
  async triggerBatteryCheck() {
    await this.auditLog.checkBatteryLevels();
    return { message: 'Battery check completed' };
  }

  @Get(':serialNumber/history')
  async getBatteryHistory(
    @Param('serialNumber') serialNumber: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number
  ) {
    return this.auditLog.getBatteryHistory(serialNumber, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Get(':serialNumber/stats')
  async getBatteryStats(@Param('serialNumber') serialNumber: string) {
    return this.auditLog.getBatteryStats(serialNumber);
  }
}