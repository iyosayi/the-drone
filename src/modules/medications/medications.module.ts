import { Module } from '@nestjs/common';
import { MedicationRepository } from './repository/medication.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Medication, MedicationSchema } from './entities/medication.entity';
import { MedicationSeeder } from './medication.seeder';
import { MedicationController } from './medication.controller';
import { HelperMethods } from '@common/helpers';
import { DronesModule } from '@modules/drones/drones.module';
import { SequenceRepository } from '@modules/drones/repository/sequence.repository';
import { SequenceService } from '@modules/drones/sequence.service';
import { Sequence, SequenceSchema } from '@modules/drones/entities/sequence.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Medication.name,
        schema: MedicationSchema,
      },
      {
        name: Sequence.name,
        schema: SequenceSchema,
      },
    ]),
  ],
  controllers: [MedicationController],
  providers: [MedicationRepository, MedicationSeeder, HelperMethods, SequenceRepository, SequenceService],
  exports: [MedicationRepository],
})
export class MedicationsModule {}
