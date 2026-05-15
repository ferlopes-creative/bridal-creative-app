/** PM2: rode na raiz do projeto com `pm2 start ecosystem.config.cjs` */
module.exports = {
  apps: [
    {
      name: "bridal-app",
      cwd: __dirname,
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
