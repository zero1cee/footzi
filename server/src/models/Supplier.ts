import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  leadTimeDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    contactPerson: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, default: 'Agra' },
    state: { type: String, default: 'Uttar Pradesh' },
    leadTimeDays: { type: Number, default: 2 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const Supplier: Model<ISupplier> = mongoose.model<ISupplier>('Supplier', SupplierSchema);
