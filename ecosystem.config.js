module.exports = {
  apps: [
    {
      name: 'mikeka',
      script: 'backend/src/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3012,
      },
    },
  ],
};
