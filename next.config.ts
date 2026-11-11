import type { NextConfig } from "next";
import pkg from "./package.json";

const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:1007";

const nextConfig: NextConfig = {
  typedRoutes: true,
  output: "standalone",
  poweredByHeader: false,
  env: {
    // Phiên bản hiển thị trên giao diện: lấy từ package.json lúc build.
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  compress: true,
  experimental: {
    // Chỉ nạp các icon/hàm thật sự dùng thay vì cả thư viện.
    optimizePackageImports: ["@phosphor-icons/react", "motion/react"],
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
