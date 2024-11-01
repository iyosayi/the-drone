import { SchemaOptions, SchemaFactory } from '@nestjs/mongoose'
import { Document, Schema as MongooseSchema } from 'mongoose'

export abstract class BaseSchema extends Document {
  deletedAt: Date | null
  static get schemaOptions(): SchemaOptions {
    return {
      timestamps: true,
      toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
          doc.id = ret._id
          delete ret._id
          delete ret.__v
          return ret
        },
      },
    }
  }
}

export function BaseSchemaFactory<T extends Document>(
  schemaClass: new () => T,
): MongooseSchema<T> {
  const schema = SchemaFactory.createForClass(schemaClass)

  schema.add({
    // @ts-ignore
    deletedAt: {
      type: Date,
      default: null,
    },
  })
  schema.set('timestamps', BaseSchema.schemaOptions.timestamps)
  schema.set('toJSON', BaseSchema.schemaOptions.toJSON)
  return schema
}
