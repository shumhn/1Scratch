/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep `next build` from replacing the CSS and manifests served by `next dev`.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false, os: false };
    return config;
  },
};
export default nextConfig;
