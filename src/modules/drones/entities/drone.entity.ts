import { Prop, Schema } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { BaseSchema, BaseSchemaFactory } from '@common/base.schema'
import { DroneModelEnum, DroneStates } from '@common/enums'

@Schema()
export class Drone extends BaseSchema {
  @Prop({ type: String, required: true, unique: true })
  serialNumber: string

  @Prop({ type: String, required: true, enum: Object.values(DroneModelEnum) })
  droneModel: DroneModelEnum

  @Prop({ type: String, required: true, enum: Object.values(DroneStates), default: DroneStates.Idle })
  state: DroneStates

  @Prop({ type: Number, required: true, min: 0, max: 500 })
  weight: number

  @Prop({ type: Number, required: true, min: 0, max: 100, default: 100 })
  battery: number
}

export const DroneSchema = BaseSchemaFactory(Drone)
export type DroneDocument = HydratedDocument<Drone>
