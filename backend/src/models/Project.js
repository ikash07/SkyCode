import { Schema, model } from 'mongoose';

const projectSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    language: { type: String, enum: ['python', 'c', 'java', 'javascript'], default: 'python' },
    theme: { type: String, default: 'vs-dark' },
    rootPath: { type: String, required: true },
    settings: {
      autoSave: { type: Boolean, default: true },
      fontSize: { type: Number, default: 14 }
    },
    lastOpenedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Project = model('Project', projectSchema);
