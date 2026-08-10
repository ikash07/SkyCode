// PM2 Ecosystem Configuration for SkyCode Backend
// Usage: pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'skycode-backend',
      script: 'src/index.js',
      cwd: '/home/ubuntu/SkyCode/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
        // Other env vars are loaded from backend/.env
      },
      // Logging
      error_file: '/home/ubuntu/logs/skycode-error.log',
      out_file: '/home/ubuntu/logs/skycode-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      autorestart: true,
      // Watch (disabled in production)
      watch: false
    }
  ]
};
