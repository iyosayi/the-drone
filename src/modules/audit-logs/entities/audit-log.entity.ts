import { Prop, Schema } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { BaseSchema, BaseSchemaFactory } from '@common/base.schema';
import { AlertTypes, DroneStates } from '@common/enums';
import { Drone } from '@modules/drones/entities/drone.entity';

@Schema()
export class AuditLog extends BaseSchema {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'Drone' })
  drone: Drone;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(DroneStates),
    default: DroneStates.Idle,
  })
  state: DroneStates;

  @Prop({ type: String, required: true, enum: Object.values(AlertTypes) })
  alertType: string;

  @Prop({ type: Number, required: true })
  batteryLevel: number;

  @Prop({ type: Date, required: true })
  timestamp: Date;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  metadata: object;
}

export const AuditLogSchema = BaseSchemaFactory(AuditLog);
export type AuditLogDocument = HydratedDocument<AuditLog>;
AuditLogSchema.index({ drone: 1, timestamp: -1 });