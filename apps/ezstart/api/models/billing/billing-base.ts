import { Schema } from 'mongoose';

export const baseLineItemSchema = new Schema({
  label: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});
