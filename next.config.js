/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add PostCSS loader for CSS modules if needed
    return config;
  },
};

export default nextConfig;