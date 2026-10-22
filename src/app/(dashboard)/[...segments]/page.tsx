import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getServerUser, serverFetch } from "@/lib/server/backend";
import { dashboardQueries } from "@/modules/dashboard/queries";
import { WorkspacePage } from "@/modules/workspace/components/workspace-page";

type PageProps = {
  params: Promise<{ segments: string[] }>;
};

async function prefetchOrSkip(queryClient: QueryClient, query: { key: readonly string[]; path: string }) {
  // Lỗi / hết hạn thì bỏ qua: client sẽ tự tải và hiện lỗi đúng chỗ.
  await queryClient.prefetchQuery({
    queryKey: query.key,
    queryFn: () => serverFetch(query.path).then((data) => data ?? Promise.reject(new Error("skip"))),
  });
}

export default async function CatchAllWorkspacePage({ params }: PageProps) {
  const { segments } = await params;
  const queryClient = new QueryClient();
  // Tổng quan: lấy sẵn số liệu, hàng việc và thông báo song song để HTML đã có nội dung.
  if (segments.length === 1 && segments[0] === "dashboard" && (await getServerUser())) {
    await Promise.all([dashboardQueries.overview, dashboardQueries.workQueue, dashboardQueries.notifications].map((query) => prefetchOrSkip(queryClient, query)));
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkspacePage segments={segments} />
    </HydrationBoundary>
  );
}
