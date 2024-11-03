import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AuditLogListernerService {
  private readonly logger = new Logger(AuditLogListernerService.name);

  @OnEvent('battery.critical')
  handleCriticalBatteryEvent(payload: any) {
    this.logger.warn(
      `CRITICAL BATTERY: Drone ${payload.serialNumber} at ${payload.batteryLevel}%`
    );
  }

  @OnEvent('battery.low')
  handleLowBatteryEvent(payload: any) {
    this.logger.warn(
      `LOW BATTERY: Drone ${payload.serialNumber} at ${payload.batteryLevel}%`
    );
  }

  @OnEvent('battery.update')
  handleBatteryUpdate(payload: any) {
    this.logger.log(
      `Battery Update: Drone ${payload.serialNumber} at ${payload.batteryLevel}%`
    );
  }
}