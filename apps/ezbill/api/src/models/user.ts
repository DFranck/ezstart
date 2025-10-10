import { CreateUser } from '@ezbill/types';
import { Document, Schema, model } from 'mongoose';

type UserDocument = CreateUser & Document;

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true },
  },
  { timestamps: true }
);

export const UserModel = model<UserDocument>('User', userSchema);