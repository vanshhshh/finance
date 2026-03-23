/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@finance-platform/shared"],
  generateBuildId: async () => null,
};

export default nextConfig;

