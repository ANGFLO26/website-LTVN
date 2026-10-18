module.exports = {
  apps: [
    {
      name: 'ltvn-api',
      script: 'dist/main.js',
      cwd: './api',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        // Same-host NGINX is the only trusted proxy in this deployment profile.
        TRUST_PROXY: 'loopback',
      },
    },
  ],
};
