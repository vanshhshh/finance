/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@finance-platform/shared"],
  generateBuildId: async () => null,
};

export default nextConfig;

