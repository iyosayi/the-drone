import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@common/base.repository';
import { Orders, OrdersDocument } from '../entities/orders.entity';
import { HelperMethods } from '@common/helpers';

@Injectable()
export class OrdersRepository extends BaseRepository<OrdersDocument> {
  constructor(
    @InjectModel(Orders.name) private orderModel: Model<OrdersDocument>,
    private readonly helperMethods: HelperMethods
  ) {
    super(orderModel);
  }
  
  async getOrders(droneId: string) {
    const pipeline = [
      {
        $match: { drone: this.helperMethods.convertToObjectId(droneId) }
      },
      {
        $lookup: {
          from: 'drones',
          localField: 'drone',
          foreignField: '_id',
          as: 'drone'
        }
      },
      {
        $unwind: {
          path: '$drone',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $lookup: {
          from: 'medications',
          localField: 'medication',
          foreignField: '_id',
          as: 'medication'
        }
      },
      {
        $unwind: {
          path: '$medication',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $group: {
          _id: '$drone._id',
          serialNumber: { $first: '$drone.serialNumber' },
          model: { $first: '$drone.droneModel' },
          medications: {
            $push: {
              name: '$medication.name',
              code: '$medication.code',
              weight: '$medication.weight',
              image: '$medication.image',
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          serialNumber: 1,
          model: 1,
          medications: 1
        }
      }
    ]
    const [orders] = await this.orderModel.aggregate(pipeline)
    return orders
  }
}
