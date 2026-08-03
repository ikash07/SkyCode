import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureRuntimeDirectories } from './utils/runtimePaths.js';

async function bootstrap(): Promise<void> {
  await ensureRuntimeDirectories();
  await connectDatabase();

  const app = createApp();
  app.listen(env.PORT, () => {
    process.stdout.write(`Backend listening on http://localhost:${env.PORT}\n`);
  });
}

void bootstrap();
