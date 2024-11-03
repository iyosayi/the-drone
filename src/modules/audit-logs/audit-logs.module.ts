import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Drone, DroneSchema } from '@modules/drones/entities/drone.entity';
import { DronesRepository } from '@modules/drones/repository/drone.repository';
import { MedicationsModule } from '@modules/medications/medications.module';
import { HelperMethods } from '@common/helpers';
import { AuditLogRepository } from './repository/audit.log.repository';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DronesModule } from '@modules/drones/drones.module';
import { AuditLogListernerService } from './event.listener';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: Drone.name,
        schema: DroneSchema,
      },
      {
        name: AuditLog.name,
        schema: AuditLogSchema,
      },
    ]),
    MedicationsModule,
    DronesModule
  ],
  controllers: [AuditLogsController],
  providers: [
    DronesRepository,
    HelperMethods,
    AuditLogService,
    AuditLogRepository,
    EventEmitter2,
    AuditLogListernerService
  ],
  exports: [
    AuditLogRepository,
    AuditLogService,
  ],
})
export class AuditLogsModule {}
