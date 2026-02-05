/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    // Add PostCSS loader for CSS modules if needed
    return config;
  },
};

export default nextConfig;