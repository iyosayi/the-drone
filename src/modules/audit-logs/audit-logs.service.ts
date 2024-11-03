import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DronesRepository } from '@modules/drones/repository/drone.repository';
import { AuditLogRepository } from './repository/audit.log.repository';
import { Drone } from '@modules/drones/entities/drone.entity';
import { AlertTypes, DroneStates } from '@common/enums';

interface BatteryAuditLog {
  drone: string;
  serialNumber: string;
  timestamp: Date;
  batteryLevel: number;
  state: string;
  alertType?: 'LOW_BATTERY' | 'CRITICAL_BATTERY' | 'NORMAL';
  metadata?: Record<string, any>;
}

interface DroneStateUpdate {
  previousState: string;
  newState: string;
  reason: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  private readonly CRITICAL_BATTERY_THRESHOLD = 10;
  private readonly LOW_BATTERY_THRESHOLD = 25;

  constructor(
    private readonly droneRepository: DronesRepository,
    private auditLogRepository: AuditLogRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cron job that runs every 10 minutes to check battery levels
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async checkBatteryLevels() {
    this.logger.log('Starting periodic battery level check...');

    try {
      const drones = await this.droneRepository.all({});
      const batteryChecks = drones.map((drone) =>
        this.processDroneBattery(drone),
      );

      await Promise.all(batteryChecks);

      this.logger.log(`Completed battery check for ${drones.length} drones`);
    } catch (error) {
      this.logger.error('Error during battery check:', error);
      this.eventEmitter.emit('monitoring.alert', {
        type: 'BATTERY_CHECK_ERROR',
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Process individual drone battery status
   */
  private async processDroneBattery(drone: Drone): Promise<void> {
    const batteryLevel = drone.battery;
    let alertType: BatteryAuditLog['alertType'] = 'NORMAL';
    let stateUpdate: DroneStateUpdate | null = null;

    if (batteryLevel <= this.CRITICAL_BATTERY_THRESHOLD) {
      alertType = AlertTypes.CriticalBattery;
      stateUpdate = await this.handleCriticalBattery(drone);
    } else if (batteryLevel <= this.LOW_BATTERY_THRESHOLD) {
      alertType = AlertTypes.LowBattery;
      stateUpdate = await this.handleLowBattery(drone);
    }

    // console.log(
    //   'AUDIT-LOG',
    //   JSON.stringify(
    //     {
    //       drone: drone.id,
    //       serialNumber: drone.serialNumber,
    //       timestamp: new Date(),
    //       batteryLevel,
    //       state: drone.state,
    //       alertType,
    //       metadata: {
    //         stateUpdate,
    //       },
    //     },
    //     null,
    //     2,
    //   ),
    // );

    await this.createBatteryAuditLog({
      drone: drone.id,
      serialNumber: drone.serialNumber,
      timestamp: new Date(),
      batteryLevel,
      state: drone.state,
      alertType,
      metadata: {
        stateUpdate,
      },
    });

    this.emitBatteryEvents(drone, batteryLevel, alertType);
  }

  /**
   * Handle critical battery situation
   */
  private async handleCriticalBattery(drone: Drone): Promise<DroneStateUpdate> {
    const previousState = drone.state;
    let newState = drone.state;
    let reason = '';

    if ([DroneStates.Delivering, DroneStates.Loaded, DroneStates.Returning].includes(drone.state)) {
      newState = DroneStates.Returning
      reason = 'Critical battery level - forced return';

      await this.droneRepository.updateOne(
        { _id: drone._id },
        {
          $set: {
            state: newState,
            lastStateChange: new Date(),
          },
        },
      );

      this.eventEmitter.emit('drone.emergency_return', {
        droneId: drone._id,
        serialNumber: drone.serialNumber,
        batteryLevel: drone.battery,
      });
    }

    return { previousState, newState, reason };
  }

  private async handleLowBattery(drone: Drone): Promise<DroneStateUpdate> {
    const previousState = drone.state;
    let newState = drone.state;
    let reason = '';

    if (drone.state === DroneStates.Idle || drone.state === DroneStates.Loading) {
      newState = DroneStates.Idle
      reason = 'Low battery - loading prevented';

      await this.droneRepository.updateOne(
        { _id: drone._id },
        {
          $set: {
            state: newState,
            lastStateChange: new Date(),
          },
        },
      );
    }

    return { previousState, newState, reason };
  }

  private async createBatteryAuditLog(
    logEntry: BatteryAuditLog,
  ): Promise<void> {
    try {
      await this.auditLogRepository.create(logEntry);
    } catch (error) {
      this.logger.error(`Error creating battery audit log: ${error.message}`);
      throw error;
    }
  }

  private emitBatteryEvents(
    drone: any,
    batteryLevel: number,
    alertType: string,
  ): void {
    const eventPayload = {
      droneId: drone._id,
      serialNumber: drone.serialNumber,
      batteryLevel,
      timestamp: new Date(),
      state: drone.state,
    };
    switch (alertType) {
      case AlertTypes.CriticalBattery:
        this.eventEmitter.emit('battery.critical', eventPayload);
        break;
      case AlertTypes.LowBattery:
        this.eventEmitter.emit('battery.low', eventPayload);
        break;
    }

    this.eventEmitter.emit('battery.update', eventPayload);
  }

  async getBatteryHistory(
    serialNumber: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {},
  ) {
    const query = {
      serialNumber,
      timestamp: {
        $gte: options.startDate || new Date(0),
        $lte: options.endDate || new Date(),
      },
    };

    return this.auditLogRepository.all({
      conditions: query,
      sort: { timestamp: -1 },
      limit: options.limit || 100,
    });
  }

  async getBatteryStats(serialNumber: string) {
    const logs = await this.auditLogRepository.all({
      conditions: {
        serialNumber,
      },
      sort: { timestamp: -1 },
    });

    const batteryLevels = logs.map((log) => log.batteryLevel);

    return {
      averageBatteryLevel: this.calculateAverage(batteryLevels),
      lowBatteryIncidents: logs.filter((log) => log.alertType === 'LOW_BATTERY')
        .length,
      criticalBatteryIncidents: logs.filter(
        (log) => log.alertType === AlertTypes.CriticalBattery,
      ).length,
      // @ts-ignore
      batteryDrainRate: this.calculateBatteryDrainRate(logs),
      lastChecked: logs[0]?.timestamp,
    };
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.length
      ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length
      : 0;
  }

  private calculateBatteryDrainRate(logs: BatteryAuditLog[]): number {
    if (logs.length < 2) return 0;

    const recentLogs = logs.slice(0, 2);
    const timeDiff =
      recentLogs[0].timestamp.getTime() - recentLogs[1].timestamp.getTime();
    const batteryDiff = recentLogs[1].batteryLevel - recentLogs[0].batteryLevel;

    return (batteryDiff / timeDiff) * 3600000; // Convert to percent per hour
  }
}
