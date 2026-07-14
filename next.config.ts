import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:1007";

const nextConfig: NextConfig = {
  typedRoutes: true,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/backend/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
