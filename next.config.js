// PATH: next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};

    // Fix: node-fetch@2 optional dependency `encoding` breaks webpack resolution on Vercel
    config.resolve.alias["encoding"] = require.resolve("./lib/encoding-stub.js");

    return config;
  },
};

module.exports = nextConfig;
