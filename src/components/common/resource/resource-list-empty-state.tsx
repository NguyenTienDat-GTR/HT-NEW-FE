import type { RouteConfig } from "@/config/routes/routes";

export function ResourceListEmptyState({ route }: { route: RouteConfig }) {
  return (
    <div className="grid min-h-[240px] place-items-center border-t border-surface-2 px-4 text-center">
      <div>
        <p className="text-base font-semibold text-foreground">Chưa có dữ liệu phù hợp</p>
        <p className="mt-1 max-w-[48ch] text-sm leading-6 text-muted">
          Thử đổi bộ lọc hoặc từ khóa tìm kiếm để tải lại danh sách {route.title.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}
