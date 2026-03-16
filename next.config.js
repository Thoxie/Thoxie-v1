// PATH: next.config.js
// FILE: next.config.js
// ACTION: OVERWRITE

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
};

module.exports = nextConfig;
