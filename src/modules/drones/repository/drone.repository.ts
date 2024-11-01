import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@common/base.repository';
import { Drone, DroneDocument } from '../entities/drone.entity';


@Injectable()
export class DronesRepository extends BaseRepository<DroneDocument> {
  constructor(
    @InjectModel(Drone.name) private droneModel: Model<DroneDocument>,
  ) {
    super(droneModel);
  }
}
