import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'
import { DronesService } from './drones.service';
import { DronesController } from './drones.controller';
import { Drone, DroneSchema } from './entities/drone.entity';
import { Sequence, SequenceSchema } from './entities/sequence.entity';
import { SequenceRepository } from './repository/sequence.repository';
import { DronesRepository } from './repository/drone.repository';
import { MedicationsModule } from '@modules/medications/medications.module';
import { Orders, OrdersSchema } from './entities/orders.entity';
import { OrdersRepository } from './repository/orders.repository';
import { HelperMethods } from '@common/helpers';
import { SequenceService } from './sequence.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Drone.name,
        schema: DroneSchema
      },
      {
        name: Sequence.name,
        schema: SequenceSchema
      },
      {
        name: Orders.name,
        schema: OrdersSchema
      }
    ]),
    MedicationsModule
  ],
  controllers: [DronesController],
  providers: [DronesService, SequenceRepository, DronesRepository, OrdersRepository, HelperMethods, SequenceService],
  exports: [SequenceRepository, DronesService, DronesRepository, SequenceRepository]
})
export class DronesModule {}
