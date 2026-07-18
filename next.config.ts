import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@tirbeo/auth', '@tirbeo/database', '@tirbeo/ui', '@tirbeo/utils', '@tirbeo/config'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
