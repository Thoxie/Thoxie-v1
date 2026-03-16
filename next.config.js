// PATH: next.config.js
// FILE: next.config.js
// ACTION: FULL OVERWRITE

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("@napi-rs/canvas");
      config.externals.push("@napi-rs/canvas-linux-x64-gnu");
      config.externals.push("@napi-rs/canvas-linux-x64-musl");
    }

    return config;
  },
};

module.exports = nextConfig;

