module.exports = {
  apps: [
    {
      name: 'student-service',
      script: './services/student-service/server.js',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
    },
    {
      name: 'admin-service',
      script: './services/admin-service/server.js',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
    },
    {
      name: 'dev-service',
      script: './services/dev-service/server.js',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
    }
  ]
};
