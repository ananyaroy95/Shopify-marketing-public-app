const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, ".env")));

module.exports = {
  apps: [
    {
      name: "adbuffs-app",
      script: "npm",
      args: "start",
      cwd: "/var/www/adbuffs_com_shopify_app",

      env: {
        ...envConfig,
        NODE_ENV: "production",
      },
    },
  ],
};