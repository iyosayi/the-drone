import { Module } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { MedicationRepository } from './repository/medication.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Medication, MedicationSchema } from './entities/medication.entity';
import { MedicationSeeder } from './medication.seeder';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Medication.name,
        schema: MedicationSchema,
      },
    ]),
  ],
  controllers: [MedicationsController],
  providers: [MedicationsService, MedicationRepository, MedicationSeeder],
  exports: [MedicationRepository],
})
export class MedicationsModule {}
