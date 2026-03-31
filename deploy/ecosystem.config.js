const path = require("path");

module.exports = {
  apps: [
    {
      name: "lira-frontend",
      cwd: path.resolve(__dirname, "../frontend"),
      script: "npm",
      args: "start -- -p 3001",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
