import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getProjectDetails } from './projectService.js';
import { spawnInteractiveExecution } from './interactiveRunner.js';
import { Execution } from '../models/Execution.js';
import { Project } from '../models/Project.js';
import { exists } from '../utils/fs.js';
import path from 'node:path';

function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

function extractTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setupTerminalSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/ws/terminal' || url.pathname === '/api/ws/terminal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    let currentRunner = null;
    let currentUserId = null;
    let currentProjectId = null;
    let currentEntryFile = '';
    let currentLanguage = '';
    let commandString = '';
    let accumulatedStdout = '';
    let accumulatedStderr = '';
    let accumulatedStdin = '';
    let startTime = 0;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryToken = url.searchParams.get('token');
    const cookieToken = extractTokenFromCookie(req.headers.cookie);
    const initialToken = queryToken || cookieToken;

    if (initialToken) {
      const decoded = verifyToken(initialToken);
      if (decoded) {
        currentUserId = decoded.sub;
      }
    }

    ws.on('message', async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());

        if (message.type === 'start') {
          // Clean up any running execution on this socket first
          if (currentRunner) {
            currentRunner.kill();
            currentRunner = null;
          }

          const token = message.token || initialToken;
          const auth = verifyToken(token);
          if (auth) {
            currentUserId = auth.sub;
          } else {
            const projectDoc = await Project.findById(message.projectId);
            if (projectDoc) {
              currentUserId = projectDoc.ownerId;
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
              return;
            }
          }

          currentProjectId = message.projectId;
          const project = await getProjectDetails(currentProjectId, currentUserId);
          const resolvedEntry = message.entryFile.replace(/^\/+/, '').replace(/\\+/g, '/');
          const entryExists = await exists(path.join(project.rootPath, resolvedEntry));
          if (!entryExists) {
            ws.send(JSON.stringify({ type: 'error', message: 'Entry file does not exist' }));
            return;
          }

          currentEntryFile = resolvedEntry;
          currentLanguage = message.language || project.language || 'python';
          accumulatedStdout = '';
          accumulatedStderr = '';
          accumulatedStdin = '';
          startTime = Date.now();

          currentRunner = await spawnInteractiveExecution({
            language: currentLanguage,
            projectRoot: project.rootPath,
            entryFile: resolvedEntry,
            onStdout: (chunk) => {
              accumulatedStdout += chunk;
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'stdout', data: chunk }));
              }
            },
            onStderr: (chunk) => {
              accumulatedStderr += chunk;
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'stderr', data: chunk }));
              }
            },
            onExit: async (exitCode) => {
              const durationMs = Date.now() - startTime;
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'exit', exitCode, durationMs }));
              }

              // Save Execution document in MongoDB
              try {
                await Execution.create({
                  projectId: currentProjectId,
                  userId: currentUserId,
                  language: currentLanguage,
                  entryFile: currentEntryFile,
                  command: commandString || `run ${currentEntryFile}`,
                  stdin: accumulatedStdin,
                  stdout: accumulatedStdout,
                  stderr: accumulatedStderr,
                  exitCode: exitCode ?? 0,
                  durationMs,
                  status: exitCode === 0 ? 'success' : 'error'
                });
              } catch {
                // Ignore DB save errors if connection offline
              }

              currentRunner = null;
            }
          });

          commandString = currentRunner.command;
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'started', command: commandString }));
          }
        } else if (message.type === 'stdin') {
          if (currentRunner) {
            const data = message.data || '';
            accumulatedStdin += data;
            currentRunner.writeInput(data);
          }
        } else if (message.type === 'stop') {
          if (currentRunner) {
            currentRunner.kill();
            currentRunner = null;
          }
        } else if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (err) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
        }
      }
    });

    ws.on('close', () => {
      if (currentRunner) {
        currentRunner.kill();
        currentRunner = null;
      }
    });
  });

  return wss;
}
