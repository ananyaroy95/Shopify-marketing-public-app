module.exports = {
  apps: [
    {
      name: "adbuffs-app",
      script: "npm",
      args: "start",
      cwd: "/var/www/adbuffs_com_shopify_app",

      env: {
        NODE_ENV: "development"
    },

    env_production: {
        NODE_ENV: "production"
    }
    }
  ]
}