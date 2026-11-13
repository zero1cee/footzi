import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';

export interface IUserAddress {
  _id?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin' | 'demo_admin';
  phone?: string;
  addresses: IUserAddress[];
  wishlist: mongoose.Types.ObjectId[];
  passwordChangedAt?: Date;
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
}

const AddressSchema = new Schema<IUserAddress>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'demo_admin'],
      default: 'customer',
    },
    phone: {
      type: String,
      trim: true,
    },
    addresses: [AddressSchema],
    // Product ids the customer has hearted; kept on the account so they follow the customer between devices
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    // Tokens issued before this moment are rejected, so a password change signs out other devices
    passwordChangedAt: { type: Date },
    // Only a SHA-256 hash of the emailed reset token is stored
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.passwordHash;
        delete ret.resetTokenHash;
        delete ret.resetTokenExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Password comparison method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Generate JWT authentication token
UserSchema.methods.generateAuthToken = function (): string {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    secret,
    { expiresIn: expiresIn as any }
  );
};

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
