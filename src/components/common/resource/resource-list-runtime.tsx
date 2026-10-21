"use client";

import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { Panel } from "@/components/ui/panel";
import { rowsFromResponse } from "@/components/form/resource-form/api-utils";
import { apiDownload, apiFetch, apiMutation, getApiErrorMessage, parseContentDispositionFilename, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction } from "@/lib/auth/permissions";
import { resolveRouteForUser } from "@/modules/workspace/super-admin-route-overrides";
import { ApprovalDialog, type CertificateSigner, type ExceptionLevelItem } from "./approval-dialog";
import { embeddedTabHref, useEmbeddedResource, withReturnTo } from "./embedded-resource-context";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { RevokeCertificateDialog } from "./revoke-certificate-dialog";
import { CourseStatusDialog } from "@/modules/training-courses/components/course-status-dialog";
import { DetailDrawer } from "./detail-drawer";
import { PositionFormDialog } from "@/modules/executive-board/components/position-form-dialog";
import { getResourceId, isAwaitingApproval } from "./resource-actions";
import { isInvalidScore, originalScore, runWithConcurrency, sameScore, type ScoreComponent, type ScoreDrafts, type ScoreEntry } from "./score-entry";
import { ScoreStats } from "./score-stats";
import { ResourceListEmptyState } from "./resource-list-empty-state";
import { ResourceListHeader } from "./resource-list-header";
import { buildResourceKpiQuerySpecs, buildResourceKpis, shouldShowResourceKpis } from "./resource-kpis";
import type { ResourceListRuntimeProps } from "./resource-list-types";
import { asPageResponse } from "./resource-list-utils";
import { ResourcePagination } from "./resource-pagination";
import { ResourceTable } from "./resource-table";
import { ResourceFilters } from "./resource-toolbar";
import { useResourceQueryState } from "./use-resource-query-state";

export function ResourceListRuntime({ route, config }: ResourceListRuntimeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const embedded = useEmbeddedResource();
  const resolvedRoute = resolveRouteForUser(route, user);
  // Nhúng trong trang khác: bỏ bộ lọc cố định khỏi thanh lọc, form tạo mới quay về đúng tab và biết khóa đang chọn.
  const effectiveRoute = embedded
    ? {
        ...resolvedRoute,
        filters: (resolvedRoute.filters ?? []).filter((filter) => !(filter.key in embedded.fixedFilters)),
        createPath: resolvedRoute.createPath
          ? withReturnTo(resolvedRoute.createPath, embedded, embedded.fixedFilters["course.courseCode"] ? { courseCode: embedded.fixedFilters["course.courseCode"] } : {})
          : undefined,
      }
    : resolvedRoute;
  const queryState = useResourceQueryState(effectiveRoute, embedded?.fixedFilters, embedded?.search);
  const query = useQuery({
    queryKey: ["resource", effectiveRoute.endpoint, queryState.queryString],
    enabled: Boolean(effectiveRoute.endpoint && user),
    queryFn: () => apiFetch<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>(`${effectiveRoute.endpoint}?${queryState.queryString}`),
    refetchOnMount: "always",
    retryOnMount: true,
    staleTime: 0,
  });

  // Khóa bị vô hiệu hóa: không tạo / duyệt / chấm điểm gì trong khóa (BE cũng chặn).
  const courseDisabled = embedded?.courseDisabled === true;
  const canCreate = canUseAction(user, effectiveRoute.actions?.create) && (config.canCreate?.(effectiveRoute, user) ?? true) && !courseDisabled;
  const pageData = asPageResponse(query.data, queryState.size);
  // Trong chi tiết khóa không hiển thị KPI (và không gọi các truy vấn KPI).
  const showKpis = !embedded && shouldShowResourceKpis(effectiveRoute);
  const kpiQuerySpecs = buildResourceKpiQuerySpecs(effectiveRoute, queryState.queryString);
  const kpiQueries = useQueries({
    queries: kpiQuerySpecs.map((spec) => ({
      queryKey: ["resource-kpi", effectiveRoute.endpoint, spec.id, spec.queryString],
      enabled: Boolean(showKpis && effectiveRoute.endpoint && user),
      queryFn: () => apiFetch<PageResponse<Record<string, unknown>>>(`${effectiveRoute.endpoint}?${spec.queryString}`),
      // Cache KPI để đổi bộ lọc qua lại không bắn lại hàng loạt request (tránh chạm giới hạn 429).
      staleTime: 60_000,
      placeholderData: keepPreviousData,
    })),
  });
  const kpiQueryTotals = Object.fromEntries(kpiQuerySpecs.map((spec, index) => [spec.id, kpiQueries[index]?.data?.totalElements ?? 0]));
  // Trong chi tiết khóa không hiển thị thẻ KPI.
  const kpis = embedded
    ? []
    : buildResourceKpis({
        route: effectiveRoute,
        pageData,
        queryTotals: kpiQueryTotals,
      });
  const rows = rowsFromResponse(query.data);
  const detailId = searchParams.get("detail");
  const positionEditId = searchParams.get("edit");
  const positionFormTarget =
    effectiveRoute.kind !== "positions" ? null : positionEditId ? ({ mode: "edit", id: positionEditId } as const) : searchParams.get("create") ? ({ mode: "create" } as const) : null;
  const toggleId = searchParams.get("toggle");
  const approveId = searchParams.get("approve");
  const rejectId = searchParams.get("reject");
  const withdrawId = searchParams.get("withdraw");
  const revokeId = searchParams.get("revoke");
  const reissueId = searchParams.get("reissue");
  const removeId = searchParams.get("remove");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<"approve" | "reject" | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDrafts>({});
  const scoreCourseCode = embedded?.fixedFilters["course.courseCode"];
  const scoreEntryEnabled = Boolean(config.scoreEntry && scoreCourseCode && canUseAction(user, effectiveRoute.actions?.score) && !courseDisabled);
  const scoreComponentsQuery = useQuery({
    queryKey: ["score-components", scoreCourseCode],
    enabled: scoreEntryEnabled,
    queryFn: () => apiFetch<ScoreComponent[]>(`/training/courses/${encodeURIComponent(String(scoreCourseCode))}/score-components`),
  });
  const canBulkApprove = Boolean(config.bulkApprovePath) && canUseAction(user, effectiveRoute.actions?.approve) && !courseDisabled;
  const canExportPdf = Boolean(config.enablePdfExport && config.pdfExportPath);
  const [exporting, setExporting] = useState(false);
  // Khi bật xuất PDF: cho chọn mọi dòng (xuất kiểm tra "đã duyệt" ở BE). Ngược lại, duyệt hàng loạt chỉ chọn hồ sơ đang chờ.
  const selectableIds = canExportPdf
    ? rows.flatMap((row) => {
        const id = getResourceId(effectiveRoute, row);
        return id ? [id] : [];
      })
    : canBulkApprove
      ? rows.filter((row) => isAwaitingApproval(row)).flatMap((row) => {
          const id = getResourceId(effectiveRoute, row);
          return id ? [id] : [];
        })
      : [];

  // Hồ sơ có thể duyệt/từ chối hàng loạt: đang chờ duyệt và khóa chưa kết thúc (khóa đã kết thúc chỉ xuất PDF).
  const rowById = (id: string) => rows.find((row) => getResourceId(effectiveRoute, row) === id);
  const bulkApprovableIds = canBulkApprove
    ? selectedIds.filter((id) => {
        const row = rowById(id);
        return Boolean(row) && isAwaitingApproval(row as Record<string, unknown>) && (row as Record<string, unknown>).courseFinished !== true;
      })
    : [];

  const revokeTarget = (id: string) => {
    const row = rowById(id);
    return {
      code: id,
      leaderName: row?.leaderFullName ? String(row.leaderFullName) : undefined,
      courseName: row?.courseName ? String(row.courseName) : undefined,
    };
  };
  // Hồ sơ ngoại lệ (chưa đủ điều kiện) phải được người duyệt chọn cấp độ đạt được sau khi hoàn thành khóa.
  const exceptionItemFor = (id: string): ExceptionLevelItem | null => {
    const row = rowById(id);
    if (!config.exceptionLevel || !row || row.eligible !== false) return null;
    const courseLevel = typeof row.courseResultingLevel === "string" ? row.courseResultingLevel : "";
    if (!courseLevel || courseLevel === "NONE") return null;
    return { id, label: String(row.leaderFullName ?? id), leaderLevel: String(row.leaderLevel ?? "NONE"), courseLevel };
  };
  const approveExceptionItems = approveId ? [exceptionItemFor(approveId)].filter((item): item is ExceptionLevelItem => item !== null) : [];
  const bulkExceptionItems = bulkApprovableIds.map(exceptionItemFor).filter((item): item is ExceptionLevelItem => item !== null);
  const closeQueryDialog = () => router.push((embedded ? embeddedTabHref(embedded) : effectiveRoute.path) as Route);
  const actionMutation = useMutation({
    mutationFn: ({ action, id, note, signer, achievedLevel }: { action: "toggle" | "approve" | "reject" | "revoke" | "reissue" | "withdraw" | "remove"; id: string; note?: string; signer?: CertificateSigner; achievedLevel?: string }) => {
      if (action === "revoke") return apiMutation(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/revoke`, "POST", { reason: note });
      if (action === "reissue") return apiMutation(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/reissue`, "POST", { reason: note });
      if (action === "remove") return apiMutation(config.buildRemovePath?.(id) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}`, "DELETE");
      if (action === "withdraw") return apiMutation(config.buildWithdrawPath?.(id) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}`, "DELETE");
      if (action === "toggle") return apiMutation(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/toggle-status`, "PATCH", { confirmationText: "Xác nhận" });
      if (action === "approve" || action === "reject") {
        const approved = action === "approve";
        const approvePath = config.buildApprovePath?.(effectiveRoute, rows, id, approved) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}/approve`;
        const approveBody = config.buildApproveBody?.(effectiveRoute, note, approved, signer, achievedLevel) ?? { approved, review: note || undefined };
        return apiMutation(approvePath, "POST", approveBody);
      }
      throw new Error("Unsupported resource action");
    },
    onSuccess: async (_data, variables) => {
      toast.success(variables.action === "toggle" ? "Đổi trạng thái thành công" : variables.action === "reject" ? "Đã từ chối duyệt" : variables.action === "revoke" ? "Đã thu hồi chứng nhận" : variables.action === "reissue" ? "Đã cấp lại chứng nhận" : variables.action === "withdraw" ? "Đã thu hồi đăng ký" : variables.action === "remove" ? "Đã xóa hồ sơ khỏi danh sách tham dự" : "Duyệt thành công");
      closeQueryDialog();
      // Thao tác có thể đổi dữ liệu ở các danh sách khác (hồ sơ tham dự, chứng nhận, khóa) và ở drawer chi tiết đang mở.
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["certificate-preview"] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ approved, note, reasons, signer, achievedLevels }: { approved: boolean; note: string; reasons?: Record<string, string>; signer?: CertificateSigner; achievedLevels?: Record<string, string> }) =>
      apiMutation<{ successCount: number; failedCount: number; failures: { leaderFullName?: string; reason: string }[] }>(
        config.bulkApprovePath ?? "",
        "POST",
        config.buildBulkBody?.(bulkApprovableIds, approved, note, reasons, signer, achievedLevels) ?? { ids: bulkApprovableIds, approved, review: note || undefined, reviews: reasons, achievedLevels },
      ),
    onSuccess: async (result, variables) => {
      const action = variables.approved ? "Duyệt" : "Từ chối";
      if (result.successCount > 0) {
        toast.success(`${action} ${result.successCount} hồ sơ thành công`);
      }
      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} hồ sơ không xử lý được: ${result.failures.map((failure) => `${failure.leaderFullName ?? "Hồ sơ"} (${failure.reason})`).join("; ")}`, { duration: 10000 });
      }
      setSelectedIds([]);
      setBulkMode(null);
      await queryClient.invalidateQueries({ queryKey: ["resource", effectiveRoute.endpoint] });
    },
  });
  const scoreComponents = scoreComponentsQuery.data ?? [];
  const dirtyScoreRowIds = Object.keys(scoreDrafts);
  const scoreEntry: ScoreEntry | undefined =
    scoreEntryEnabled && scoreComponents.length
      ? {
          components: scoreComponents,
          drafts: scoreDrafts,
          // Chứng nhận đã duyệt thì khóa điểm (BE cũng chặn).
          isEditable: (row) => row.certificateApprovalStatus !== "APPROVED" && embedded?.scoringOpen !== false && embedded?.scoreLocked !== true,
          valueOf: (rowId, row, componentId) => scoreDrafts[rowId]?.values[componentId] ?? originalScore(row, componentId),
          isInvalid: (component, value) => isInvalidScore(component, value),
          onChange: (rowId, row, componentId, value) =>
            setScoreDrafts((current) => {
              const entry = current[rowId] ?? { row, values: {} };
              const values = { ...entry.values };
              if (sameScore(value, originalScore(row, componentId))) delete values[componentId];
              else values[componentId] = value;
              const next = { ...current };
              if (Object.keys(values).length === 0) delete next[rowId];
              else next[rowId] = { row, values };
              return next;
            }),
        }
      : undefined;
  // Lưu điểm chạy nền: không khóa giao diện, người dùng vẫn nhập tiếp, lọc, đổi trang trong lúc lưu.
  const [savingScoreIds, setSavingScoreIds] = useState<string[]>([]);
  const savingScoreIdsRef = useRef<Set<string>>(new Set());
  const pendingScoreRowIds = dirtyScoreRowIds.filter((id) => !savingScoreIds.includes(id));

  function saveScoresInBackground() {
    const snapshot = Object.entries(scoreDrafts).filter(([id]) => !savingScoreIdsRef.current.has(id));
    if (snapshot.length === 0) return;
    const jobs: { id: string; label: string; values: Record<string, string>; body: unknown }[] = [];
    const problems: string[] = [];
    for (const [id, draft] of snapshot) {
      const label = String(draft.row.leaderFullName ?? id);
      const entries = scoreComponents.map((component) => ({ component, text: draft.values[component.id] ?? originalScore(draft.row, component.id) }));
      const missing = entries.filter((entry) => entry.text.trim() === "");
      if (missing.length) {
        problems.push(`${label}: thiếu điểm ${missing.map((entry) => entry.component.name).join(", ")}`);
        continue;
      }
      const invalid = entries.find((entry) => isInvalidScore(entry.component, entry.text));
      if (invalid) {
        problems.push(`${label}: điểm ${invalid.component.name} phải từ 0 đến ${Number(invalid.component.maxScore)}`);
        continue;
      }
      jobs.push({
        id,
        label,
        values: { ...draft.values },
        body: {
          componentScores: entries.map((entry) => ({ componentId: entry.component.id, score: Number(entry.text) })),
          review: typeof draft.row.review === "string" ? draft.row.review : undefined,
        },
      });
    }
    if (problems.length) toast.error(`${problems.length} hồ sơ chưa hợp lệ: ${problems.join("; ")}`);
    if (jobs.length === 0) return;

    jobs.forEach((job) => savingScoreIdsRef.current.add(job.id));
    setSavingScoreIds((current) => [...current, ...jobs.map((job) => job.id)]);
    const toastId = toast.loading(`Đang lưu điểm ${jobs.length} hồ sơ...`);

    // Không await: tác vụ tự chạy nền, kết quả báo qua toast. Tối đa 4 request song song.
    void (async () => {
      const results = await runWithConcurrency(jobs, 4, (job) =>
        apiFetch(`/training/participations/${encodeURIComponent(job.id)}/score`, { method: "PATCH", body: JSON.stringify(job.body) }),
      );
      const saved: typeof jobs = [];
      const failures: string[] = [];
      results.forEach((result, index) => {
        const job = jobs[index];
        if (!job) return;
        if (result.status === "fulfilled") saved.push(job);
        else failures.push(`${job.label}: ${getApiErrorMessage(result.reason)}`);
      });
      jobs.forEach((job) => savingScoreIdsRef.current.delete(job.id));
      setSavingScoreIds((current) => current.filter((id) => !jobs.some((job) => job.id === id)));
      // Chỉ bỏ bản nháp nếu người dùng chưa sửa tiếp trong lúc lưu.
      setScoreDrafts((current) => {
        const next = { ...current };
        saved.forEach((job) => {
          const draft = next[job.id];
          if (draft && JSON.stringify(draft.values) === JSON.stringify(job.values)) delete next[job.id];
        });
        return next;
      });
      if (failures.length) toast.error(`${failures.length} hồ sơ chưa lưu được: ${failures.join("; ")}`, { id: toastId });
      else toast.success(`Đã lưu điểm ${saved.length} hồ sơ`, { id: toastId });
      if (saved.length && failures.length) toast.success(`Đã lưu điểm ${saved.length} hồ sơ`);
      if (saved.length) await queryClient.invalidateQueries({ queryKey: ["resource", effectiveRoute.endpoint] });
    })();
  }

  const saveScoresButton = scoreEntryEnabled ? (
    <Tip disabled label="Lưu điểm các hồ sơ đã nhập hoặc sửa trên bảng">
      <Button disabled={pendingScoreRowIds.length === 0 || embedded?.scoringOpen === false || embedded?.scoreLocked === true} onClick={saveScoresInBackground} type="button">
        {pendingScoreRowIds.length ? `Lưu điểm (${pendingScoreRowIds.length})` : savingScoreIds.length ? `Đang lưu ${savingScoreIds.length}...` : "Lưu điểm"}
      </Button>
    </Tip>
  ) : null;
  async function exportPdf(ids: string[]) {
    if (!config.pdfExportPath || ids.length === 0) return;

    // Kiểm tra ngay trên giao diện: chỉ cho xuất chứng nhận đã duyệt, nêu rõ chứng nhận nào chưa được duyệt.
    const notApproved = ids
      .map((id) => rows.find((row) => getResourceId(effectiveRoute, row) === id))
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .filter((row) => (row.approvalStatus ?? row.certificateApprovalStatus) !== "APPROVED")
      .map((row) => {
        const name = String(row.leaderFullName ?? row.certificateCode ?? getResourceId(effectiveRoute, row) ?? "");
        const current = row.approvalStatus ?? row.certificateApprovalStatus;
        const status = current === "REJECTED" ? "bị từ chối" : current === "REVOKED" ? "đã bị thu hồi" : "chưa duyệt";
        return `${name} (${status})`;
      });
    if (notApproved.length) {
      toast.error(`Chỉ xuất được chứng nhận đã duyệt. Vui lòng bỏ chọn ${notApproved.length} chứng nhận: ${notApproved.join("; ")}`, {
        duration: 10000,
      });
      return;
    }

    // Xuất chạy nền: tạo job rồi hỏi trạng thái định kỳ, không khóa giao diện; tải về khi xong.
    // Nhờ vậy xuất vài trăm chứng nhận một lần cũng không treo request.
    const base = config.pdfExportPath;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    setExporting(true);
    const toastId = toast.loading(`Đang tạo PDF ${ids.length} chứng nhận...`);
    try {
      const submit = await apiFetch<{ jobId: string; status: string; error?: string }>(`${base}/jobs`, {
        method: "POST",
        body: JSON.stringify({ certificateCodes: ids }),
      });
      let status = submit.status;
      let error = submit.error;
      for (let attempt = 0; attempt < 200 && status === "PENDING"; attempt += 1) {
        await sleep(1500);
        const next = await apiFetch<{ status: string; error?: string }>(`${base}/jobs/${encodeURIComponent(submit.jobId)}`);
        status = next.status;
        error = next.error;
      }
      if (status !== "DONE") throw new Error(error || "Quá thời gian tạo PDF, vui lòng thử lại");

      const response = await apiDownload(`${base}/jobs/${encodeURIComponent(submit.jobId)}/file`);
      const blob = await response.blob();
      const filename = parseContentDispositionFilename(response.headers.get("content-disposition")) ?? "chung-nhan.pdf";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Đã xuất PDF ${ids.length} chứng nhận`, { id: toastId });
    } catch (error) {
      toast.error(getApiErrorMessage(error), { id: toastId, duration: 10000 });
    } finally {
      setExporting(false);
    }
  }

  const exportActions = canExportPdf ? (
    <>
      <span className="whitespace-nowrap text-sm text-muted">Đã chọn {selectedIds.length} hồ sơ</span>
      <Tip disabled={selectedIds.length === 0} label="Xuất PDF chứng nhận cho các hồ sơ đã chọn (chỉ chứng nhận đã duyệt)">
        <Button disabled={selectedIds.length === 0 || exporting} onClick={() => exportPdf(selectedIds)} size="sm" type="button">
          {exporting ? "Đang xuất..." : "Xuất PDF"}
        </Button>
      </Tip>
    </>
  ) : null;
  // Tab chấm điểm: thống kê còn bao nhiêu người và cột điểm nào chưa nhập, nằm cùng hàng với bộ lọc.
  const scoreStats =
    scoreEntryEnabled && scoreComponents.length > 0 && scoreCourseCode ? (
      <ScoreStats components={scoreComponents} courseCode={scoreCourseCode} drafts={scoreDrafts} endpoint={effectiveRoute.endpoint ?? "/training/participants"} />
    ) : null;
  const bulkActions = canBulkApprove ? (
    <>
      <span className="whitespace-nowrap text-sm text-muted">Có thể duyệt {bulkApprovableIds.length} hồ sơ</span>
      <Tip disabled={bulkApprovableIds.length === 0} label="Duyệt các hồ sơ đang chờ (khóa đã kết thúc sẽ bị bỏ qua)">
        <Button disabled={bulkApprovableIds.length === 0} onClick={() => setBulkMode("approve")} size="sm" type="button">
          Duyệt đã chọn
        </Button>
      </Tip>
      <Tip disabled={bulkApprovableIds.length === 0} label="Từ chối các hồ sơ đang chờ, bắt buộc nhập lý do (khóa đã kết thúc sẽ bị bỏ qua)">
        <Button disabled={bulkApprovableIds.length === 0} onClick={() => setBulkMode("reject")} size="sm" type="button" variant="outline">
          Từ chối đã chọn
        </Button>
      </Tip>
    </>
  ) : null;
  const selection = canBulkApprove || canExportPdf
    ? {
        selectedIds,
        selectableIds,
        onToggle: (id: string) => setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id])),
        onToggleAll: (on: boolean) => setSelectedIds(on ? selectableIds : []),
      }
    : undefined;

  return (
    <div className="space-y-5">
      <ResourceListHeader
        kpis={kpis}
        kpisLoading={query.isLoading || kpiQueries.some((kpiQuery) => kpiQuery.isLoading)}
        moduleLabel={config.moduleLabel}
        route={effectiveRoute}
        embedded={Boolean(embedded)}
      />

      <Panel className="overflow-hidden">
        <ResourceFilters
          filterValues={queryState.filterValues}
          route={effectiveRoute}
          search={queryState.search}
          setSearch={queryState.setSearch}
          status={queryState.status}
          updateFilter={queryState.updateFilter}
          updateParam={queryState.updateParam}
          resetFilters={queryState.resetFilters}
          canCreate={canCreate}
          hideSearch={Boolean(embedded)}
          extraActions={saveScoresButton}
          leadingActions={bulkActions || exportActions || config.toolbarActions ? <>{config.toolbarActions}{bulkActions}{exportActions}</> : scoreStats}
        />
        {scoreEntryEnabled && embedded?.scoreLocked === true ? (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs font-medium text-foreground">Điểm của khóa đang bị khóa chỉnh sửa. Cần mở khóa mới nhập được điểm.</div>
        ) : null}
        {scoreEntryEnabled && embedded?.scoringOpen === false ? (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs font-medium text-foreground">{embedded.scoringHint ?? "Chỉ chấm điểm được khi khóa đang diễn ra."}</div>
        ) : null}
        <ResourceTable
          selection={selection}
          onExportRow={canExportPdf ? (id) => exportPdf([id]) : undefined}
          exportingRow={exporting}
          scoreEntry={scoreEntry}
          page={queryState.page}
          isLoading={query.isLoading}
          route={effectiveRoute}
          rows={rows}
          size={queryState.size}
          sort={queryState.sort}
          sortBy={queryState.sortBy}
          sortDirection={queryState.sortDirection}
        />

        {!query.isLoading && rows.length === 0 ? <ResourceListEmptyState route={effectiveRoute} /> : null}

        {query.isError && !query.isFetching ? (
          <div className="mx-4 mb-4 rounded-[10px] border border-danger/30 bg-danger/5 p-3 text-sm font-medium text-danger">
            {getApiErrorMessage(query.error)}
          </div>
        ) : null}

        <ResourcePagination
          data={pageData}
          page={queryState.page}
          size={queryState.size}
          updatePage={queryState.updatePage}
          updatePageSize={queryState.updatePageSize}
        />
      </Panel>

      <DetailDrawer id={detailId} onClose={closeQueryDialog} route={effectiveRoute} />
      {effectiveRoute.kind === "positions" ? <PositionFormDialog onClose={closeQueryDialog} target={positionFormTarget} /> : null}
      {effectiveRoute.kind === "courses" ? (
        // Khóa huấn luyện: cảnh báo tác động lên chứng nhận, xác nhận và đối chiếu trạng thái đích ở BE.
        <CourseStatusDialog
          courseCode={toggleId}
          courseName={toggleId ? String(rowById(toggleId)?.courseName ?? "") : undefined}
          endpoint={effectiveRoute.endpoint ?? "/training/courses"}
          onClose={closeQueryDialog}
        />
      ) : (
        <ConfirmActionDialog
          action="toggle"
          loading={actionMutation.isPending}
          onClose={closeQueryDialog}
          onConfirm={() => toggleId && actionMutation.mutate({ action: "toggle", id: toggleId })}
          open={Boolean(toggleId)}
          title="Đổi trạng thái bản ghi"
        />
      )}
      <ApprovalDialog
        key={approveId ?? "approve-closed"}
        captureSigner={config.captureSigner}
        exceptionItems={approveExceptionItems}
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={(note, _reasons, signer, achievedLevels) => approveId && actionMutation.mutate({ action: "approve", id: approveId, note, signer, achievedLevel: achievedLevels?.[approveId] })}
        open={Boolean(approveId)}
      />
      <ApprovalDialog
        key={bulkMode ?? "bulk-closed"}
        captureSigner={config.captureSigner}
        exceptionItems={bulkExceptionItems}
        loading={bulkMutation.isPending}
        mode={bulkMode === "reject" ? "reject" : "approve"}
        onClose={() => setBulkMode(null)}
        onConfirm={(note, reasons, signer, achievedLevels) => bulkMode && bulkMutation.mutate({ approved: bulkMode === "approve", note, reasons, signer, achievedLevels })}
        items={bulkApprovableIds.map((id) => {
          const row = rowById(id);
          return { id, label: String(row?.leaderFullName ?? id) };
        })}
        open={bulkMode !== null}
      />
      <ConfirmActionDialog
        action="withdraw"
        confirmLabel="Xóa"
        description="Hồ sơ sẽ bị xóa khỏi danh sách tham dự kể cả điểm đã nhập (nếu có). Không xóa được hồ sơ đã có chứng nhận."
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => removeId && actionMutation.mutate({ action: "remove", id: removeId })}
        open={Boolean(removeId)}
        requireConfirmText={false}
        title="Xóa khỏi danh sách tham dự"
      />
      <ConfirmActionDialog
        action="withdraw"
        confirmLabel="Thu hồi"
        description="Đăng ký sẽ bị xóa khỏi khóa huấn luyện và huynh trưởng có thể được đăng ký lại. Chỉ người gửi mới được thu hồi, và chỉ khi hồ sơ chưa được duyệt hoặc từ chối."
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => withdrawId && actionMutation.mutate({ action: "withdraw", id: withdrawId })}
        open={Boolean(withdrawId)}
        requireConfirmText={false}
        title="Thu hồi đăng ký"
      />
      <RevokeCertificateDialog
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={(reason) => revokeId && actionMutation.mutate({ action: "revoke", id: revokeId, note: reason })}
        target={revokeId ? revokeTarget(revokeId) : null}
      />
      <RevokeCertificateDialog
        key={`reissue:${reissueId ?? ""}`}
        loading={actionMutation.isPending}
        mode="reissue"
        onClose={closeQueryDialog}
        onConfirm={(reason) => reissueId && actionMutation.mutate({ action: "reissue", id: reissueId, note: reason })}
        target={reissueId ? revokeTarget(reissueId) : null}
      />
      <ApprovalDialog
        loading={actionMutation.isPending}
        mode="reject"
        onClose={closeQueryDialog}
        onConfirm={(note) => rejectId && actionMutation.mutate({ action: "reject", id: rejectId, note })}
        open={Boolean(rejectId)}
      />
    </div>
  );
}
