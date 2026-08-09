import { Schema, model } from 'mongoose';

const executionSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    language: { type: String, enum: ['python', 'c', 'java'], required: true },
    entryFile: { type: String, required: true },
    command: { type: String, required: true },
    stdin: { type: String, default: '' },
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    exitCode: { type: Number, default: -1 },
    durationMs: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'error', 'timeout'], required: true }
  },
  { timestamps: true }
);

export const Execution = model('Execution', executionSchema);
