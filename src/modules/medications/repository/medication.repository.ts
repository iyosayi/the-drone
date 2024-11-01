import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '@common/base.repository';
import { Medication, MedicationDocument } from '../entities/medication.entity';

@Injectable()
export class MedicationRepository extends BaseRepository<MedicationDocument> {
  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
  ) {
    super(medicationModel);
  }
}
