import { Schema, model } from 'mongoose';

const fileSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    path: { type: String, required: true },
    kind: { type: String, enum: ['file', 'directory'], required: true },
    content: { type: String, default: '' },
    language: { type: String, default: '' }
  },
  { timestamps: true }
);

fileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export const FileEntry = model('FileEntry', fileSchema);
