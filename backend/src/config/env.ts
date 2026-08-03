import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176'),
  DOCKER_EXECUTION_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(12),
  DOCKER_EXECUTION_MEMORY_MB: z.coerce.number().int().positive().default(512),
  DOCKER_EXECUTION_CPU_QUOTA: z.coerce.number().positive().default(1)
});

export const env = envSchema.parse(process.env);
