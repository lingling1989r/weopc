module.exports = {
  apps: [
    {
      name: 'weopc-api',
      cwd: '/home/weopc/weopc/apps/api',
      script: 'dist/server.js',
      interpreter: 'node',
      env_file: '/home/weopc/weopc/apps/api/.env.production',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'weopc-web',
      cwd: '/home/weopc/weopc/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3003',
      interpreter: 'node',
      env_file: '/home/weopc/weopc/apps/web/.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
      },
    },
  ],
};
