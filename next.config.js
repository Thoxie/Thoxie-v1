// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Backup for @/ alias in case TS paths aren't picked up in certain environments
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": require("path").resolve(__dirname),
    };
    return config;
  },
};

module.exports = nextConfig;
