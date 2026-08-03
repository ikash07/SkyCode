import { Schema, model } from 'mongoose';

export interface IUser {
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
