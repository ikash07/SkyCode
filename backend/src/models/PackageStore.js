import { Schema, model } from 'mongoose';

const packageStoreSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, lowercase: true },
    language: { type: String, enum: ['python', 'node'], default: 'python' },
    archiveBase64: { type: String, required: true },
    sizeBytes: { type: Number, default: 0 },
    installedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

packageStoreSchema.index({ name: 1, language: 1 }, { unique: true });

export const PackageStore = model('PackageStore', packageStoreSchema);
