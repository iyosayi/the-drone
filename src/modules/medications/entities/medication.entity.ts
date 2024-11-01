import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { IsString, Matches, IsNumber, Min, Max } from 'class-validator';
import { BaseSchema, BaseSchemaFactory } from '@common/base.schema';

@Schema()
export class Medication extends BaseSchema {
  @Prop({ 
    required: true, 
    validate: {
      validator: function(v: string) {
        return /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'Name can only contain letters, numbers, hyphen, and underscore'
    }
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Name can only contain letters, numbers, hyphen, and underscore'
  })
  name: string;

  @Prop({ 
    required: true, 
    min: 1, 
    max: 10000 
  })
  @IsNumber()
  @Min(1)
  @Max(10000)
  weight: number;

  @Prop({ 
    required: true, 
    validate: {
      validator: function(v: string) {
        return /^[A-Z0-9_]+$/.test(v);
      },
      message: 'Code can only contain uppercase letters, numbers, and underscore'
    }
  })
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code can only contain uppercase letters, numbers, and underscore'
  })
  code: string;

  @Prop()
  @IsString()
  image?: string;
}

export const MedicationSchema = BaseSchemaFactory(Medication);
export type MedicationDocument = HydratedDocument<Medication>