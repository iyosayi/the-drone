import { Schema as MongooseSchema, HydratedDocument } from 'mongoose';
import { BaseSchema, BaseSchemaFactory } from '@common/base.schema';
import { Prop, Schema} from '@nestjs/mongoose';

export interface ISequence {
  _id: string;
  sequenceName: string;
  currentValue: number;
  increment: number;
  prefix: string;
  lastUpdated: Date;
  createdAt: Date;
  description?: string;
  maxValue?: number;
  minValue?: number;
  metadata?: Record<string, any>;
}

@Schema({
  collection: 'sequences',
  timestamps: true,
  optimisticConcurrency: true,
  validateBeforeSave: true
})
export class Sequence extends BaseSchema {
  @Prop({ 
    required: true, 
    unique: true, 
    index: true 
  })
  sequenceName: string;

  @Prop({ 
    required: true, 
    default: 0,
    min: [0, 'Sequence value cannot be negative'] 
  })
  currentValue: number;

  @Prop({ 
    required: true, 
    default: 1,
    validate: {
      validator: (v: number) => v > 0,
      message: 'Increment must be positive'
    }
  })
  // @ts-ignore
  increment: number;

  @Prop({ 
    required: true,
    default: 'DRN'
  })
  prefix: string;

  @Prop({ 
    required: true,
    default: Date.now 
  })
  lastUpdated: Date;

  @Prop({ 
    required: true,
    default: Date.now 
  })
  createdAt: Date;

  @Prop()
  description?: string;

  @Prop({ 
    validate: {
      validator: function(maxVal: number) {
        // If minValue is set, maxValue must be greater
        const minVal = (this as any).minValue;
        return !minVal || maxVal > minVal;
      },
      message: 'Maximum value must be greater than minimum value'
    }
  })
  maxValue?: number;

  @Prop()
  minValue?: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, any>;
}

// @ts-ignore
export type SequenceDocument = HydratedDocument<Sequence>
// @ts-ignore
export const SequenceSchema = BaseSchemaFactory(Sequence);

SequenceSchema.index({ sequenceName: 1 }, { unique: true });
SequenceSchema.index({ lastUpdated: 1 });


SequenceSchema.methods.getNext = async function(): Promise<number> {
  const sequence = this as SequenceDocument;
  if (sequence.maxValue && sequence.currentValue + sequence.increment > sequence.maxValue) {
    throw new Error(`Sequence ${sequence.sequenceName} has reached its maximum value`);
  }

  sequence.currentValue += sequence.increment;
  sequence.lastUpdated = new Date();
  await sequence.save();
  return sequence.currentValue;
};

