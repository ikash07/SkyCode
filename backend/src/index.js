import dns from 'node:dns';
import http from 'node:http';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureRuntimeDirectories } from './utils/runtimePaths.js';
import { setupTerminalSocket } from './services/terminalSocket.js';

// Force IPv4 first DNS lookup to prevent Windows querySrv ECONNREFUSED issues on Node 18+
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if not supported in environment
}

async function bootstrap() {
  await ensureRuntimeDirectories();

  const app = createApp();
  const server = http.createServer(app);

  // Setup WebSocket server for real-time interactive terminal streaming
  setupTerminalSocket(server);

  // Always start server listening immediately on PORT so backend is never offline
  server.listen(env.PORT, '0.0.0.0', () => {
    process.stdout.write(`✅ Backend server listening on http://0.0.0.0:${env.PORT} (${process.env.NODE_ENV || 'development'})\n`);
    process.stdout.write(`⚡ WebSocket terminal active on ws://0.0.0.0:${env.PORT}/ws/terminal\n`);
  });

  // Connect to MongoDB in background; don't crash process if offline or connecting
  connectDatabase().catch((err) => {
    process.stderr.write(`⚠️ Initial database connection error: ${err.message}\n`);
  });
}

void bootstrap();
