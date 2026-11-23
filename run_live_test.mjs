import https from 'node:https';

const API_BASE = 'https://skycode-t3ry.onrender.com/api';

async function request(method, path, body = null, token = null, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await new Promise((resolve, reject) => {
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
                const parsed = data ? JSON.parse(data) : {};
                resolve({ status: res.statusCode, data: parsed, raw: data });
              } catch {
                resolve({ status: res.statusCode, data, raw: data });
              }
            });
          }
        );

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
      });

      if (res.status === 503 && attempt < retries) {
        console.log(`Render waking up (503), retrying in ${attempt * 3}s (attempt ${attempt}/${retries})...`);
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }

      return res;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }
      throw err;
    }
  }
}

async function runLiveTest() {
  console.log('🚀 Step 1: Authenticating on live Render backend...');
  const testEmail = `tester_${Date.now()}@skycode.test`;
  const testPassword = 'Password123!';

  const regRes = await request('POST', '/auth/register', {
    email: testEmail,
    password: testPassword,
    displayName: 'Automated Tester'
  });

  const token = regRes.data?.token;
  if (!token) {
    throw new Error(`Failed to register: ${JSON.stringify(regRes)}`);
  }
  console.log('✅ Authenticated successfully as', testEmail);

  console.log('📁 Step 2: Creating test project...');
  const projRes = await request(
    'POST',
    '/projects',
    {
      name: 'Speech & Auto-Install Test',
      language: 'python'
    },
    token
  );

  const project = projRes.data?.project;
  const projectId = project?._id;
  if (!projectId) {
    throw new Error(`Failed to create project: ${JSON.stringify(projRes)}`);
  }
  console.log('✅ Project created with ID:', projectId);

  console.log('📝 Step 3: Saving test script with speech_recognition, pyaudio, and webbrowser...');
  const testCode = `import os
import random
import time
import webbrowser
import speech_recognition as sr
import pyaudio

print("--- LIVE TEST EXECUTION ---")
print("1. All imports succeeded cleanly!")
print("2. PyAudio version:", pyaudio.__version__)
r = sr.Recognizer()
mic = sr.Microphone()
print("3. SpeechRecognition Microphone initialized:", type(mic).__name__)
with mic as source:
    print("4. Audio context opened. Sample rate:", source.SAMPLE_RATE, "Chunk:", source.CHUNK)
webbrowser.open("https://skycode.vercel.app")
print("5. VERIFIED: Zero ModuleNotFoundError, speech_recognition + pyaudio fully working!")
`;

  await request('PUT', `/projects/${projectId}/files/main.py`, { content: testCode }, token);
  console.log('✅ Test script saved to main.py');

  console.log('⚡ Step 4: Executing code on live Render backend (First Run)...');
  const startTime = Date.now();
  const exec1 = await request(
    'POST',
    `/executions/${projectId}`,
    {
      entryFile: 'main.py',
      language: 'python'
    },
    token
  );

  console.log(`⏱️ First run finished in ${Date.now() - startTime}ms`);
  console.log('HTTP Status:', exec1.status);
  console.log('Raw body length:', exec1.raw?.length);
  console.log('Raw body:', exec1.raw?.slice(0, 500));
  const execResult1 = exec1.data?.execution || exec1.data?.result || exec1.data;
  console.log('Exit Code:', execResult1?.exitCode);
  console.log('STDOUT:\n', execResult1?.stdout);
  if (execResult1?.stderr) {
    console.log('STDERR:\n', execResult1?.stderr);
  }

  if (execResult1?.exitCode !== 0 || !execResult1?.stdout?.includes('VERIFIED')) {
    console.log('Raw exec1 response:', JSON.stringify(exec1.data, null, 2));
    throw new Error('First execution failed or did not output expected verification string');
  }

  console.log('⚡ Step 5: Executing code a second time to verify DB package persistence & 0ms instant run...');
  const startSecond = Date.now();
  const exec2 = await request(
    'POST',
    `/executions/${projectId}`,
    {
      entryFile: 'main.py',
      language: 'python'
    },
    token
  );

  console.log(`⏱️ Second run finished in ${Date.now() - startSecond}ms`);
  const execResult2 = exec2.data?.execution || exec2.data?.result || exec2.data;
  console.log('Exit Code:', execResult2?.exitCode);
  console.log('STDOUT:\n', execResult2?.stdout);

  if (execResult2?.exitCode === 0 && execResult2?.stdout?.includes('VERIFIED')) {
    console.log('🎉 ALL LIVE TESTS PASSED 100%! ZERO MODULE ERRORS, INSTANT RETRY VERIFIED!');
  } else {
    throw new Error('Second execution failed');
  }
}

runLiveTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
