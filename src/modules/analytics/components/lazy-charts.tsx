"use client";

import dynamic from "next/dynamic";
import { SkeletonBlock } from "@/modules/analytics/components/section-card";

// recharts nặng và chỉ vẽ được ở trình duyệt: tải riêng, lúc chờ hiện khung giữ đúng chiều cao nên không nhảy bố cục.
export const TrendChart = dynamic(() => import("@/modules/analytics/components/trend-chart").then((module) => module.TrendChart), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-[340px] w-full" />,
});
