import { spawn } from 'node:child_process';

function start(command, args, label) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  child.on('error', (error) => {
    console.error(`[${label}]`, error.message);
    process.exitCode = 1;
  });

  return child;
}

const backend = start('npm', ['run', 'dev', '--workspace', 'backend'], 'backend');
const frontend = start('npm', ['run', 'dev', '--workspace', 'frontend'], 'frontend');

process.on('SIGINT', () => {
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
});
