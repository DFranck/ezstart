import { Schema, SchemaTypeOptions } from 'mongoose';
import {
  ZodArray,
  ZodEffects,
  ZodEnum,
  ZodNumber,
  ZodObject,
  ZodString,
  ZodTypeAny,
} from 'zod';

type ZodToMongooseField =
  | SchemaTypeOptions<any>
  | Schema
  | [ZodToMongooseField];

export function zodToMongooseSchema(
  zod: ZodObject<any>
): Record<string, ZodToMongooseField> {
  const fields: Record<string, ZodToMongooseField> = {};

  for (const [key, value] of Object.entries(zod.shape)) {
    if (value instanceof ZodEffects) {
      const inner = value._def.schema;
      fields[key] =
        inner instanceof ZodObject
          ? new Schema(zodToMongooseSchema(inner), { _id: false })
          : { type: Schema.Types.Mixed };
    } else if (value instanceof ZodString) {
      fields[key] = { type: String };
    } else if (value instanceof ZodNumber) {
      fields[key] = { type: Number };
    } else if (value instanceof ZodEnum) {
      fields[key] = { type: String, enum: value._def.values };
    } else if (value instanceof ZodArray) {
      const inner = value._def.type as ZodTypeAny;
      if (inner instanceof ZodString) {
        fields[key] = [{ type: String }];
      } else if (
        inner instanceof ZodArray &&
        inner._def.type instanceof ZodString
      ) {
        fields[key] = [[{ type: String }]];
      } else if (inner instanceof ZodObject) {
        fields[key] = [new Schema(zodToMongooseSchema(inner), { _id: false })];
      } else {
        console.warn(`Unsupported ZodArray inner type on "${key}"`);
      }
    } else if (value instanceof ZodObject) {
      fields[key] = new Schema(zodToMongooseSchema(value), { _id: false });
    } else {
      console.warn(`Unsupported Zod type on "${key}"`);
    }
  }

  return fields;
}
