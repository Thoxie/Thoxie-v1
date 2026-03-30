// PATH: /next.config.js
// DIRECTORY: /
// FILE: next.config.js
// ACTION: OVERWRITE ENTIRE FILE

/** @type {import('next').NextConfig} */
const serverExternalPackages = [
  "@napi-rs/canvas",
  "@napi-rs/canvas-linux-x64-gnu",
  "@napi-rs/canvas-linux-x64-musl",
  "pdf-parse",
  "pdf-parse/worker",
];

const nextConfig = {
  pageExtensions: ["js", "jsx", "ts"],
  experimental: {
    serverComponentsExternalPackages: serverExternalPackages,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [];

      for (const pkg of serverExternalPackages) {
        if (!externals.includes(pkg)) {
          externals.push(pkg);
        }
      }

      config.externals = externals;
    }

    return config;
  },
};

module.exports = nextConfig;

