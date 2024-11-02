import { Prop, Schema } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'
import { BaseSchema, BaseSchemaFactory } from '@common/base.schema'
import { Drone } from './drone.entity'
import { Medication } from '@modules/medications/entities/medication.entity'

@Schema()
export class Orders extends BaseSchema {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'Drone' })
  drone: Drone

  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'Medication' })
  medication: Medication
}

export const OrdersSchema = BaseSchemaFactory(Orders)
export type OrdersDocument = HydratedDocument<Orders>
