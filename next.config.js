// PATH: next.config.js

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};

    // Fix: node-fetch@2 optional dependency `encoding` breaks webpack resolution on Vercel
    config.resolve.alias["encoding"] = require.resolve("./lib/encoding-stub.js");

    // Resolve tsconfig path alias "@/*" -> "./*"
    config.resolve.alias['@'] = path.resolve(__dirname);

    return config;
  },
};

module.exports = nextConfig;
