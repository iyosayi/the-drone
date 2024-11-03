import { Module } from '@nestjs/common';
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
  controllers: [],
  providers: [MedicationRepository, MedicationSeeder],
  exports: [MedicationRepository],
})
export class MedicationsModule {}
