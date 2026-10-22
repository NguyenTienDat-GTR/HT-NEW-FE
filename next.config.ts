import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:1007";

const nextConfig: NextConfig = {
  typedRoutes: true,
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Chỉ nạp các icon/hàm thật sự dùng thay vì cả thư viện.
    optimizePackageImports: ["@phosphor-icons/react", "motion/react", "date-fns"],
  },
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
