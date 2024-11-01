import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '@common/base.repository';
import { LoadDroneDto } from '../dto/create-drone.dto';
import { Orders, OrdersDocument } from '../entities/orders.entity';

@Injectable()
export class OrdersRepository extends BaseRepository<OrdersDocument> {
  constructor(
    @InjectModel(Orders.name) private orderModel: Model<OrdersDocument>,
  ) {
    super(orderModel);
  }
  
  async loadDrone(data: LoadDroneDto) {
    try {
        return await this.orderModel.create({drone: data.droneSerialNumber, medication: data.medication.code})
    } catch (error) {
        
    }
  }

  async getOrders(droneId: string) {
    const pipeline = [
      {
        $match: {drone: droneId}
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
        $project: {
          id: '$_id',
          serialNumber: '$serialNumber',
          model: '$droneModel',
          battery: '$battery',
          orders: {$push: '$$ROOT'}
        }
      }
    ]
    const orders = await this.orderModel.aggregate(pipeline)
    return orders
  }
}
