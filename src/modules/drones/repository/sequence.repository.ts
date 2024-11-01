import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@common/base.repository';
import { Sequence, SequenceDocument } from '../entities/sequence.entity';


@Injectable()
export class SequenceRepository extends BaseRepository<SequenceDocument> {
  constructor(
    @InjectModel(Sequence.name) private sequenceModel: Model<SequenceDocument>,
  ) {
    super(sequenceModel);
  }
}
