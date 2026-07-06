import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@tirbeo/auth', '@tirbeo/database', '@tirbeo/ui', '@tirbeo/utils', '@tirbeo/config'],
};

export default nextConfig;
