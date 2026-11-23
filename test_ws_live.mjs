import { WebSocket } from 'ws';
import https from 'node:https';

const API_BASE = 'https://skycode-t3ry.onrender.com/api';
const WS_BASE = 'wss://skycode-t3ry.onrender.com/ws/terminal';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const postData = body ? JSON.stringify(body) : null;
    const req = https.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testWebSocketExecution() {
  console.log('Connecting to Live WebSocket Terminal...');
  const testEmail = `tester_${Date.now()}@skycode.test`;
  const reg = await request('POST', '/auth/register', {
    email: testEmail,
    password: 'Password123!',
    displayName: 'WS Tester'
  });
  const token = reg.data.token;
  const proj = await request('POST', '/projects', { name: 'WS Test', language: 'python' }, token);
  const projectId = proj.data.project._id;

  const testScript = `
import os
import random
import time
import webbrowser
import speech_recognition as sr
import pyaudio

print("=== LIVE WEBSOCKET TERMINAL TEST ===")
print("1. All imports OK!")
print("2. PyAudio emulation active, version:", pyaudio.__version__)
r = sr.Recognizer()
mic = sr.Microphone()
print("3. SpeechRecognition Microphone created successfully:", type(mic).__name__)
with mic as source:
    print("4. Audio context opened! Sample rate:", source.SAMPLE_RATE, "Chunk:", source.CHUNK)
webbrowser.open("https://skycode.vercel.app")
print("SUCCESS: 0 MODULE ERRORS, SPEECH_RECOGNITION FULLY FUNCTIONAL!")
`;

  await request('PUT', `/projects/${projectId}/files/main.py`, { content: testScript }, token);
  console.log('Project created & main.py saved:', projectId);

  console.log('Opening WebSocket connection to:', `${WS_BASE}?token=${token}`);
  const ws = new WebSocket(`${WS_BASE}?token=${token}`);

  let stdoutAccum = '';
  let exitCodeReceived = null;

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ WebSocket connected! Sending start message...');
      ws.send(JSON.stringify({
        type: 'start',
        projectId,
        entryFile: 'main.py',
        language: 'python',
        token
      }));
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'started') {
        console.log('⚡ Execution started! Command:', msg.command);
      } else if (msg.type === 'stdout') {
        process.stdout.write(msg.data);
        stdoutAccum += msg.data;
      } else if (msg.type === 'stderr') {
        process.stderr.write(msg.data);
      } else if (msg.type === 'exit') {
        console.log(`🏁 Execution exited with code ${msg.exitCode} (${msg.durationMs}ms)`);
        exitCodeReceived = msg.exitCode;
        ws.close();
        resolve();
      } else if (msg.type === 'error') {
        console.error('❌ Server error:', msg.message);
        ws.close();
        reject(new Error(msg.message));
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket connection error:', err.message);
      reject(err);
    });
  });

  if (exitCodeReceived === 0 && stdoutAccum.includes('SUCCESS: 0 MODULE ERRORS')) {
    console.log('\n🎉 LIVE WEBSOCKET TERMINAL TEST PASSED 100%!');
  } else {
    throw new Error('Test failed or did not exit with code 0');
  }
}

testWebSocketExecution().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
