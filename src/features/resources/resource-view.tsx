"use client";

import { DotsThree, FunnelSimple, MagnifyingGlass, PencilSimple, Plus, SlidersHorizontal } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { apiFetch, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch } from "@/lib/api/search";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { cn, viNumber } from "@/lib/utils";
import type { RouteConfig } from "@/features/workspace/routes";

const columnLabels: Record<string, string> = {
  action: "Hành động",
  actionCode: "Action",
  approvalStatus: "Duyệt",
  assignedAt: "Ngày gán",
  certificateApprovalStatus: "Chứng nhận",
  certificateCode: "Mã chứng nhận",
  chaplain: "Tuyên úy",
  chapterName: "Xứ đoàn",
  code: "Mã",
  courseCode: "Mã khóa",
  courseName: "Khóa",
  courseType: "Loại khóa",
  createdAt: "Ngày tạo",
  deaneryId: "Giáo hạt",
  description: "Mô tả",
  dioceseId: "Giáo phận",
  displayOrder: "Thứ tự",
  email: "Email",
  endDate: "Ngày kết thúc",
  eventType: "Sự kiện",
  expiresAt: "Hết hạn",
  expression: "Biểu thức",
  fullName: "Họ tên",
  gender: "Giới tính",
  holyName: "Tên thánh",
  hostYear: "Năm",
  imageUrl: "Ảnh",
  ipAddress: "IP",
  isPrimary: "Chính",
  leaderFullName: "Huynh trưởng",
  leaderLevel: "Cấp HT",
  location: "Địa điểm",
  locked: "Khóa",
  loggedAt: "Thời gian",
  maxScore: "Điểm tối đa",
  moduleCode: "Module",
  name: "Tên",
  parishId: "Giáo xứ",
  passed: "Kết quả",
  passingScore: "Điểm đạt",
  permissionCode: "Mã quyền",
  permissionName: "Tên quyền",
  phoneNumber: "SĐT",
  positionCode: "Mã chức vụ",
  positionName: "Chức vụ",
  positionType: "Cấp áp dụng",
  primaryRoleCode: "Vai trò",
  readAt: "Đã đọc",
  reason: "Lý do",
  registrationEndAt: "Hết đăng ký",
  requiredCurrentLevel: "Cấp yêu cầu",
  requiredMinAge: "Tuổi tối thiểu",
  requirementCode: "Mã điều kiện",
  requirementName: "Điều kiện",
  resourceCode: "Resource",
  resourceType: "Đối tượng",
  roleCode: "Mã vai trò",
  roleName: "Vai trò",
  scopeCode: "Scope",
  startDate: "Ngày bắt đầu",
  status: "Trạng thái",
  title: "Tiêu đề",
  totalScore: "Tổng điểm",
  unionName: "Liên đoàn",
  unitId: "Đơn vị",
  unitType: "Loại đơn vị",
  username: "Tài khoản",
};

const levelLabels: Record<string, string> = {
  NONE: "Chưa có cấp",
  HT_XU: "HT xứ",
  DU_TRUONG: "Dự trưởng",
  HT_I: "HT cấp I",
  HT_II: "HT cấp II",
  HT_III: "HT cấp III",
  HLV_I: "HLV cấp I",
  HLV_II: "HLV cấp II",
  HLV_III: "HLV cấp III",
};

export function ResourceView({ route }: { route: RouteConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const page = Number(searchParams.get("page") ?? 0);
  const size = Number(searchParams.get("size") ?? 10) as 10 | 20 | 50 | 100;
  const status = searchParams.get("status") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? undefined;
  const sortDirection = (searchParams.get("sortDirection") as "ASC" | "DESC" | null) ?? "ASC";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (search) next.set("search", search);
      else next.delete("search");
      next.set("page", "0");
      router.replace(`${pathname}?${next.toString()}` as Route);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname, router, search, searchParams]);

  const queryString = useMemo(() => {
    return serializeBaseSearch({
      page,
      size,
      search,
      status: status === "all" ? undefined : status === "active",
      searchFields: route.searchFields,
      sortBy,
      sortDirection,
    }).toString();
  }, [page, route.searchFields, search, size, sortBy, sortDirection, status]);

  const query = useQuery({
    queryKey: ["resource", route.endpoint, queryString],
    enabled: Boolean(route.endpoint),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>>>(`${route.endpoint}?${queryString}`),
  });

  const canCreate = route.actionPermissionPrefixes?.some((prefix) => hasPermissionPrefix(user, prefix)) ?? false;
  const rows = query.data?.content ?? [];

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    next.set("page", "0");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function updatePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(Math.max(nextPage, 0)));
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  function sort(column: string) {
    const next = new URLSearchParams(searchParams);
    next.set("sortBy", column);
    next.set("sortDirection", sortBy === column && sortDirection === "ASC" ? "DESC" : "ASC");
    router.replace(`${pathname}?${next.toString()}` as Route);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex h-7 items-center gap-2 rounded-full border border-border bg-white px-3 text-xs font-semibold text-muted">
            <FunnelSimple className="h-3.5 w-3.5 text-primary" />
            {route.moduleName}
          </div>
          <h1 className="text-2xl font-semibold tracking-[0] text-foreground">{route.title}</h1>
          <p className="mt-1 max-w-[72ch] text-sm text-muted">{route.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <SlidersHorizontal size={18} />
            Bộ lọc
          </Button>
          {route.primaryActionLabel ? (
            <Button disabled={!canCreate} title={canCreate ? undefined : "Tài khoản hiện tại chưa có quyền tạo/cập nhật"}>
              <Plus size={18} />
              {route.primaryActionLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {route.workflowHint ? (
        <div className="rounded-[10px] border border-primary/20 bg-primary/[0.06] px-4 py-3 text-sm text-foreground">{route.workflowHint}</div>
      ) : null}

      <Panel className="overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative w-full xl:max-w-[420px]">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Tìm kiếm ${route.title.toLowerCase()}`}
                value={search}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {route.filterLabels?.map((label) => (
                <span className="inline-flex h-10 items-center rounded-[8px] border border-border bg-white px-3 text-sm text-muted" key={label}>
                  {label}
                </span>
              ))}
              <select
                aria-label="Lọc trạng thái"
                className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm text-foreground"
                onChange={(event) => updateParam("status", event.target.value)}
                value={status}
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
              <select
                aria-label="Số dòng mỗi trang"
                className="h-10 rounded-[8px] border border-border bg-white px-3 text-sm text-foreground"
                onChange={(event) => updateParam("size", event.target.value)}
                value={size}
              >
                {[10, 20, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value} dòng
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-surface-1">
                {route.columns.map((column) => (
                  <th className="h-12 border-b border-border px-4 font-semibold text-foreground" key={column}>
                    <button className="inline-flex h-10 items-center gap-1 rounded-[8px] px-1" onClick={() => sort(column)} type="button">
                      {columnLabels[column] ?? column}
                      {sortBy === column ? <span className="text-xs text-primary">{sortDirection}</span> : null}
                    </button>
                  </th>
                ))}
                <th className="h-12 border-b border-border px-4 text-right font-semibold text-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading
                ? Array.from({ length: size }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {route.columns.map((column) => (
                        <td className="h-14 border-b border-surface-2 px-4" key={column}>
                          <span className="block h-4 w-28 rounded bg-surface-2 motion-safe:animate-pulse" />
                        </td>
                      ))}
                      <td className="h-14 border-b border-surface-2 px-4 text-right">
                        <span className="ml-auto block h-9 w-20 rounded bg-surface-2 motion-safe:animate-pulse" />
                      </td>
                    </tr>
                  ))
                : rows.map((row, rowIndex) => (
                    <tr className="hover:bg-surface-1" key={String(row.id ?? row.username ?? row.certificateCode ?? rowIndex)}>
                      {route.columns.map((column) => (
                        <td className="h-14 border-b border-surface-2 px-4 align-middle" key={column}>
                          <Cell column={column} row={row} value={row[column]} />
                        </td>
                      ))}
                      <td className="h-14 border-b border-surface-2 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button size="sm" variant="ghost">
                            <PencilSimple size={16} />
                            Sửa
                          </Button>
                          <Button aria-label="Mở thêm thao tác" size="icon" variant="ghost">
                            <DotsThree size={20} weight="bold" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!query.isLoading && rows.length === 0 ? (
          <div className="grid min-h-[220px] place-items-center px-4 text-center">
            <div>
              <p className="text-base font-semibold text-foreground">Chưa có dữ liệu phù hợp</p>
              <p className="mt-1 text-sm text-muted">Thử đổi bộ lọc hoặc từ khóa tìm kiếm để tải lại danh sách.</p>
            </div>
          </div>
        ) : null}

        {query.isError ? (
          <div className="mx-4 mb-4 rounded-[8px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {getApiErrorMessage(query.error)}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            Tổng {viNumber.format(query.data?.totalElements ?? 0)} bản ghi, trang {page + 1}/
            {Math.max(query.data?.totalPages ?? 1, 1)}
          </span>
          <div className="flex gap-2">
            <Button disabled={page <= 0} onClick={() => updatePage(page - 1)} variant="outline">
              Trước
            </Button>
            <Button disabled={query.data?.last ?? true} onClick={() => updatePage(page + 1)} variant="outline">
              Sau
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Cell({ column, row, value }: { column: string; row: Record<string, unknown>; value: unknown }) {
  if (column === "imageUrl") return <Avatar name={String(row.fullName ?? row.leaderFullName ?? row.username ?? "")} src={value} />;
  if (column === "status" && typeof value === "boolean") return <StatusBadge active={value} />;
  if (column === "effect" && typeof value === "string") return <EffectBadge effect={value} />;
  if (column === "leaderLevel" && typeof value === "string") return <Badge>{levelLabels[value] ?? value}</Badge>;
  if (column === "passed" && typeof value === "boolean") return <Badge tone={value ? "success" : "danger"}>{value ? "Đạt" : "Chưa đạt"}</Badge>;
  if (column === "locked" && typeof value === "boolean") return <Badge tone={value ? "warning" : "neutral"}>{value ? "Đã khóa" : "Có thể sửa"}</Badge>;
  if (column.toLowerCase().includes("status") && typeof value === "string") return <WorkflowBadge value={value} />;
  if (typeof value === "boolean") return <Badge tone={value ? "success" : "neutral"}>{value ? "Có" : "Không"}</Badge>;
  if (value === null || value === undefined || value === "") return <span className="text-muted">Chưa có</span>;
  if (typeof value === "number") return viNumber.format(value);
  return <span className="line-clamp-1 max-w-[260px]">{String(value)}</span>;
}

function Avatar({ name, src }: { name: string; src: unknown }) {
  const initial = name.trim().charAt(0).toUpperCase() || "H";
  if (typeof src === "string" && src) {
    return (
      <span
        aria-label={name || "Ảnh đại diện"}
        className="inline-flex h-9 w-9 rounded-full border border-border bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${src})` }}
      />
    );
  }
  return <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">{initial}</span>;
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? "Đang hoạt động" : "Tạm ngưng"}</Badge>;
}

function EffectBadge({ effect }: { effect: string }) {
  return <Badge tone={effect === "DENY" ? "danger" : "success"}>{effect}</Badge>;
}

function WorkflowBadge({ value }: { value: string }) {
  const tone = value.includes("APPROVED") || value.includes("COMPLETED") ? "success" : value.includes("REJECTED") ? "danger" : "warning";
  const label = value
    .replace("APPROVED", "Đã duyệt")
    .replace("REJECTED", "Từ chối")
    .replace("PENDING", "Chờ xử lý")
    .replace("SUBMITTED", "Đã gửi")
    .replace("COMPLETED", "Hoàn thành")
    .replace("UNCOMPLETED", "Chưa hoàn thành")
    .replace("REGISTERED", "Đã đăng ký")
    .replace("ATTENDED", "Đã tham dự")
    .replace("CANCELLED", "Đã hủy")
    .replace("NOT_REQUIRED", "Không yêu cầu");
  return <Badge tone={tone}>{label}</Badge>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "danger" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold",
        tone === "neutral" && "border-border bg-surface-1 text-muted",
        tone === "success" && "border-success/25 bg-success/10 text-success",
        tone === "danger" && "border-danger/25 bg-danger/10 text-danger",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-700",
      )}
    >
      {children}
    </span>
  );
}
