"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { Panel } from "@/components/ui/panel";
import { rowsFromResponse } from "@/components/form/resource-form/api-utils";
import { apiDownload, apiFetch, apiMutation, apiMutationOnce, getApiErrorMessage, parseContentDispositionFilename, type PageResponse } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction, hasPermissionPrefix } from "@/lib/auth/permissions";
import { resolveRouteForUser } from "@/modules/workspace/super-admin-route-overrides";
import { ApprovalDialog, type CertificateSigner, type ExceptionLevelItem, type ExceptionReasonItem } from "./approval-dialog";
import { embeddedTabHref, useEmbeddedResource, withReturnTo } from "./embedded-resource-context";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { HelpTip } from "@/components/ui/help-tip";
import type { ExceptionReviewTarget } from "@/modules/training-workflow/components/exception-review-info";
import { ExcelExportButton, EXCEL_EXPORT_FILES } from "./excel-export-button";
import { ExcelImportDialog } from "./excel-import-dialog";
import { RevokeCertificateDialog } from "./revoke-certificate-dialog";
import { CourseStatusDialog } from "@/modules/training-courses/components/course-status-dialog";
import { UnitToggleDialog } from "@/modules/organizations/components/unit-toggle-dialog";
import { DetailDrawer } from "./detail-drawer";
import { PositionFormDialog } from "@/modules/executive-board/components/position-form-dialog";
import { AssignmentFormDialog } from "@/modules/executive-board/components/assignment-form-dialog";
import { getResourceId, isAwaitingApproval, isReapprovable } from "./resource-actions";
import { isInvalidScore, originalNote, originalScore, runWithConcurrency, sameScore, type ScoreComponent, type ScoreDrafts, type ScoreEntry, type ScoreNoteDrafts } from "./score-entry";
import { ScoreStats } from "./score-stats";
import { ResourceListEmptyState } from "./resource-list-empty-state";
import { ResourceListHeader } from "./resource-list-header";
import type { ResourceListRuntimeProps } from "./resource-list-types";
import { asPageResponse } from "./resource-list-utils";
import { ResourcePagination } from "./resource-pagination";
import { ResourceTable } from "./resource-table";
import { ViewModeToggle } from "./view-mode-toggle";
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
          ? withReturnTo(resolvedRoute.createPath, embedded, embedded.fixedFilters["course.courseCode"] ? { courseCode: embedded.fixedFilters["course.courseCode"], ...(embedded.courseName ? { courseName: embedded.courseName } : {}) } : {})
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
  const rows = rowsFromResponse(query.data);
  const detailId = searchParams.get("detail");
  // Thu hồi quyền hàng loạt của vai trò / tài khoản: trang riêng giống trang phân quyền.
  const permissionRevokeAction = effectiveRoute.kind === "role-permissions" || effectiveRoute.kind === "account-permissions" ? effectiveRoute.actions?.revoke : undefined;
  const permissionRevokeButton =
    permissionRevokeAction?.route && !embedded && canUseAction(user, permissionRevokeAction) ? (
      <Button asChild className="shrink-0 justify-center" variant="outline">
        <Link href={permissionRevokeAction.route as Route}>{permissionRevokeAction.label}</Link>
      </Button>
    ) : null;
  const positionEditId = searchParams.get("edit");
  const modalFormTarget = positionEditId ? ({ mode: "edit", id: positionEditId } as const) : searchParams.get("create") ? ({ mode: "create" } as const) : null;
  const positionFormTarget = effectiveRoute.kind === "positions" ? modalFormTarget : null;
  // Phân công không sửa được (giữ lịch sử nhiệm kì): chỉ mở modal tạo mới.
  const assignmentFormTarget = effectiveRoute.kind === "executive-board" && !embedded && searchParams.get("create") ? ({ mode: "create" } as const) : null;
  const toggleId = searchParams.get("toggle");
  const approveId = searchParams.get("approve");
  const rejectId = searchParams.get("reject");
  const withdrawId = searchParams.get("withdraw");
  const revokeId = searchParams.get("revoke");
  const revokePermissionId = searchParams.get("revokePermission");
  const resetPasswordId = searchParams.get("resetPassword");
  const reissueId = searchParams.get("reissue");
  const removeId = searchParams.get("remove");
  const [viewMode, setViewMode] = useState<"table" | "card">(config.cardView?.defaultMode ?? "table");
  const showCards = Boolean(config.cardView) && !embedded && viewMode === "card";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<"approve" | "reject" | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDrafts>({});
  // Nhận xét kết quả khóa của hồ sơ nhập ở tab chấm điểm: tạm lưu khi đóng hộp nhận xét, gửi server khi bấm nút lưu.
  const [noteDrafts, setNoteDrafts] = useState<ScoreNoteDrafts>({});
  const scoreCourseCode = embedded?.fixedFilters["course.courseCode"];
  const scoreEntryEnabled = Boolean(config.scoreEntry && scoreCourseCode && canUseAction(user, effectiveRoute.actions?.score) && !courseDisabled);
  const scoreComponentsQuery = useQuery({
    queryKey: ["score-components", scoreCourseCode],
    enabled: scoreEntryEnabled,
    // Thành phần điểm có thể bị tắt/bật ở màn hình khác: luôn lấy lại danh sách cột khi vào tab chấm điểm.
    refetchOnMount: "always",
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
  // Duyệt được cả hồ sơ bị từ chối (duyệt lại); từ chối chỉ áp dụng cho hồ sơ đang chờ duyệt.
  const bulkEligibleIds = (allowReapprove: boolean) =>
    canBulkApprove
      ? selectedIds.filter((id) => {
          const row = rowById(id);
          return Boolean(row) && (isAwaitingApproval(row!) || (allowReapprove && isReapprovable(row!))) && (row!.courseFinished !== true || row!.coursePast === true);
        })
      : [];
  // Duyệt hàng loạt chỉ áp dụng cho hồ sơ đủ điều kiện; hồ sơ ngoại lệ phải duyệt riêng để chọn cấp độ đạt được.
  const bulkApprovableIds = bulkEligibleIds(true).filter((id) => rowById(id)?.eligible !== false);
  const bulkRejectableIds = bulkEligibleIds(false);
  const bulkTargetIds = bulkMode === "reject" ? bulkRejectableIds : bulkApprovableIds;

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
  // Lý do đặc cách của hồ sơ đăng ký ngoại lệ (giáo xứ nêu khi đăng ký), hiện trong hộp thoại duyệt / từ chối.
  const exceptionReasonFor = (id: string): ExceptionReasonItem | null => {
    const row = rowById(id);
    const parts: string[] = [];
    if (typeof row?.exceptionReason === "string" && row.exceptionReason.trim()) parts.push(row.exceptionReason.trim());
    if (typeof row?.offTargetReason === "string" && row.offTargetReason.trim()) parts.push(`Gửi ngoài đợt: ${row.offTargetReason.trim()}`);
    if (typeof row?.crossDeaneryReason === "string" && row.crossDeaneryReason.trim()) {
      parts.push(`Gửi liên giáo hạt${typeof row.homeDeaneryName === "string" && row.homeDeaneryName ? ` (từ ${row.homeDeaneryName})` : ""}: ${row.crossDeaneryReason.trim()}`);
    }
    return parts.length ? { id, label: String(row?.leaderFullName ?? id), reason: parts.join("\n") } : null;
  };
  // Thông tin tham chiếu khi duyệt một hồ sơ ngoại lệ (chỉ màn Duyệt đăng ký có hồ sơ ngoại lệ).
  const exceptionProfileFor = (id: string): ExceptionReviewTarget | null => {
    const row = rowById(id);
    if (!config.exceptionLevel || !row || row.eligible !== false || typeof row.leaderId !== "string" || typeof row.courseCode !== "string") return null;
    return {
      leaderId: row.leaderId,
      courseCode: row.courseCode,
      holyName: typeof row.leaderHolyName === "string" ? row.leaderHolyName : undefined,
      fullName: typeof row.leaderFullName === "string" ? row.leaderFullName : undefined,
      parishName: typeof row.parishName === "string" ? row.parishName : undefined,
      deaneryName: typeof row.deaneryName === "string" ? row.deaneryName : undefined,
      leaderLevel: typeof row.leaderLevel === "string" ? row.leaderLevel : undefined,
    };
  };
  const exceptionReasonsOf = (ids: string[]) => ids.map(exceptionReasonFor).filter((item): item is ExceptionReasonItem => item !== null);
  const approveExceptionItems = approveId ? [exceptionItemFor(approveId)].filter((item): item is ExceptionLevelItem => item !== null) : [];
  const bulkExceptionItems = bulkApprovableIds.map(exceptionItemFor).filter((item): item is ExceptionLevelItem => item !== null);
  const closeQueryDialog = () => router.push((embedded ? embeddedTabHref(embedded) : effectiveRoute.path) as Route);
  const actionMutation = useMutation({
    mutationFn: ({ action, id, note, signer, achievedLevel }: { action: "toggle" | "approve" | "reject" | "revoke" | "reissue" | "withdraw" | "remove" | "revokePermission" | "resetPassword"; id: string; note?: string; signer?: CertificateSigner; achievedLevel?: string }) => {
      // Đặt lại mật khẩu: mật khẩu tạm chỉ gửi qua email, API chỉ trả về email đã che và hạn dùng.
      if (action === "resetPassword") return apiMutationOnce<{ maskedEmail?: string }>(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/reset-password`, "POST");
      if (action === "revokePermission") {
        const row = rowById(id);
        const target = effectiveRoute.kind === "role-permissions" ? { roleCode: row?.roleCode } : { username: row?.username };
        return apiMutation(`${effectiveRoute.endpoint}/revoke`, "POST", { ...target, permissionCodes: [row?.permissionCode] });
      }
      // Thu hồi / cấp lại / duyệt / từ chối dùng Idempotency-Key: bấm đúp hoặc gửi lại sau lỗi mạng chỉ thực hiện một lần.
      if (action === "revoke") return apiMutationOnce(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/revoke`, "POST", { reason: note });
      if (action === "reissue") return apiMutationOnce(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/reissue`, "POST", { reason: note });
      if (action === "remove") {
        // Khóa quá khứ có endpoint xóa học viên riêng (hồ sơ được xóa hẳn, không chuyển về trạng thái từ chối).
        if (embedded?.coursePast === true && scoreCourseCode) return apiMutation(`/training/courses/${encodeURIComponent(scoreCourseCode)}/participants/${encodeURIComponent(id)}`, "DELETE");
        return apiMutation(config.buildRemovePath?.(id) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}`, "DELETE");
      }
      if (action === "withdraw") return apiMutation(config.buildWithdrawPath?.(id) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}`, "DELETE");
      if (action === "toggle") return apiMutation(`${effectiveRoute.endpoint}/${encodeURIComponent(id)}/toggle-status`, "PATCH", { confirmationText: "Xác nhận" });
      if (action === "approve" || action === "reject") {
        const approved = action === "approve";
        const approvePath = config.buildApprovePath?.(effectiveRoute, rows, id, approved) ?? `${effectiveRoute.endpoint}/${encodeURIComponent(id)}/approve`;
        const approveBody = config.buildApproveBody?.(effectiveRoute, note, approved, signer, achievedLevel) ?? { approved, review: note || undefined };
        return apiMutationOnce(approvePath, "POST", approveBody);
      }
      throw new Error("Unsupported resource action");
    },
    onSuccess: async (data, variables) => {
      toast.success(variables.action === "resetPassword" ? `Đã gửi mật khẩu tạm tới ${(data as { maskedEmail?: string } | undefined)?.maskedEmail ?? "email đã đăng ký"}, hiệu lực 10 phút` : variables.action === "toggle" ? "Đổi trạng thái thành công" : variables.action === "revokePermission" ? "Đã thu hồi quyền" : variables.action === "reject" ? "Đã từ chối duyệt" : variables.action === "revoke" ? "Đã thu hồi chứng nhận" : variables.action === "reissue" ? "Đã cấp lại chứng nhận" : variables.action === "withdraw" ? "Đã thu hồi đăng ký" : variables.action === "remove" ? "Đã chuyển hồ sơ về trạng thái từ chối duyệt" : "Duyệt thành công");
      closeQueryDialog();
      // Thao tác có thể đổi dữ liệu ở các danh sách khác (hồ sơ tham dự, chứng nhận, khóa) và ở drawer chi tiết đang mở.
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["certificate-preview"] });
      await queryClient.invalidateQueries({ queryKey: ["executive-board-seats"] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ approved, note, reasons, signer, achievedLevels }: { approved: boolean; note: string; reasons?: Record<string, string>; signer?: CertificateSigner; achievedLevels?: Record<string, string> }) =>
      apiMutationOnce<{ successCount: number; failedCount: number; failures: { leaderFullName?: string; reason: string }[] }>(
        config.bulkApprovePath ?? "",
        "POST",
        config.buildBulkBody?.(approved ? bulkApprovableIds : bulkRejectableIds, approved, note, reasons, signer, achievedLevels) ?? { ids: approved ? bulkApprovableIds : bulkRejectableIds, approved, review: note || undefined, reviews: reasons, achievedLevels },
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
  const dirtyScoreRowIds = Array.from(new Set([...Object.keys(scoreDrafts), ...Object.keys(noteDrafts)]));
  const scoreEntry: ScoreEntry | undefined =
    scoreEntryEnabled && scoreComponents.length
      ? {
          notes: {
            drafts: noteDrafts,
            // Sửa được nhận xét cả khi điểm đã khóa; chỉ chặn khi khóa kết thúc hoặc bị vô hiệu hóa.
            editable: embedded?.courseFinished !== true && !courseDisabled,
            valueOf: (rowId, row) => noteDrafts[rowId]?.note ?? originalNote(row),
            isDirty: (rowId) => noteDrafts[rowId] !== undefined,
            onChange: (rowId, row, value) =>
              setNoteDrafts((current) => {
                const next = { ...current };
                if (value.trim() === originalNote(row).trim()) delete next[rowId];
                else next[rowId] = { row, note: value };
                return next;
              }),
          },
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
    const scoreSnapshot = Object.entries(scoreDrafts).filter(([id]) => !savingScoreIdsRef.current.has(id));
    const noteOnlyIds = Object.keys(noteDrafts).filter((id) => !scoreDrafts[id] && !savingScoreIdsRef.current.has(id));
    if (scoreSnapshot.length === 0 && noteOnlyIds.length === 0) return;
    type Job = { id: string; label: string; values: Record<string, string>; note?: string; kind: "score" | "note"; body: unknown };
    const jobs: Job[] = [];
    const problems: string[] = [];
    for (const [id, draft] of scoreSnapshot) {
      const label = String(draft.row.leaderFullName ?? id);
      const entries = scoreComponents.map((component) => ({ component, text: draft.values[component.id] ?? originalScore(draft.row, component.id) }));
      // Cho phép lưu riêng từng cột điểm: chỉ gửi những cột đã có điểm, cột trống để nhập sau.
      const filled = entries.filter((entry) => entry.text.trim() !== "");
      if (filled.length === 0) {
        problems.push(`${label}: chưa nhập điểm nào`);
        continue;
      }
      const invalid = filled.find((entry) => isInvalidScore(entry.component, entry.text));
      if (invalid) {
        problems.push(`${label}: điểm ${invalid.component.name} phải từ 0 đến ${Number(invalid.component.maxScore)}`);
        continue;
      }
      const note = noteDrafts[id]?.note;
      jobs.push({
        id,
        label,
        values: { ...draft.values },
        note,
        kind: "score",
        body: {
          componentScores: filled.map((entry) => ({ componentId: entry.component.id, score: Number(entry.text) })),
          review: typeof draft.row.review === "string" ? draft.row.review : undefined,
          scoreNote: note,
        },
      });
    }
    // Hồ sơ chỉ sửa nhận xét (kể cả khi điểm đã khóa): gửi riêng, không động tới điểm.
    for (const id of noteOnlyIds) {
      const draft = noteDrafts[id];
      if (!draft) continue;
      jobs.push({ id, label: String(draft.row.leaderFullName ?? id), values: {}, note: draft.note, kind: "note", body: { note: draft.note } });
    }
    if (problems.length) toast.error(`${problems.length} hồ sơ chưa hợp lệ: ${problems.join("; ")}`);
    if (jobs.length === 0) return;

    jobs.forEach((job) => savingScoreIdsRef.current.add(job.id));
    setSavingScoreIds((current) => [...current, ...jobs.map((job) => job.id)]);
    const toastId = toast.loading(`Đang lưu ${jobs.length} hồ sơ...`);

    // Không await: tác vụ tự chạy nền, kết quả báo qua toast. Tối đa 4 request song song.
    void (async () => {
      const results = await runWithConcurrency(jobs, 4, (job) =>
        apiFetch(`/training/participations/${encodeURIComponent(job.id)}/${job.kind === "note" ? "score-note" : "score"}`, { method: "PATCH", body: JSON.stringify(job.body) }),
      );
      const saved: Job[] = [];
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
        saved.filter((job) => job.kind === "score").forEach((job) => {
          const draft = next[job.id];
          if (draft && JSON.stringify(draft.values) === JSON.stringify(job.values)) delete next[job.id];
        });
        return next;
      });
      setNoteDrafts((current) => {
        const next = { ...current };
        saved.forEach((job) => {
          if (job.note !== undefined && next[job.id]?.note === job.note) delete next[job.id];
        });
        return next;
      });
      if (failures.length) toast.error(`${failures.length} hồ sơ chưa lưu được: ${failures.join("; ")}`, { id: toastId });
      else toast.success(`Đã lưu ${saved.length} hồ sơ`, { id: toastId });
      if (saved.length && failures.length) toast.success(`Đã lưu ${saved.length} hồ sơ`);
      if (saved.length) {
        await queryClient.invalidateQueries({ queryKey: ["resource", effectiveRoute.endpoint] });
        await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
      }
    })();
  }

  const saveScoresButton = scoreEntryEnabled ? (
    <Tip disabled label={embedded?.scoreLocked === true ? "Điểm đã khóa: chỉ lưu nhận xét các hồ sơ đã sửa" : "Lưu điểm và nhận xét các hồ sơ đã nhập hoặc sửa trên bảng"}>
      <Button disabled={pendingScoreRowIds.length === 0 || embedded?.courseFinished === true} onClick={saveScoresInBackground} type="button">
        {pendingScoreRowIds.length
          ? `${embedded?.scoreLocked === true ? "Lưu nhận xét" : "Lưu"} (${pendingScoreRowIds.length})`
          : savingScoreIds.length
            ? `Đang lưu ${savingScoreIds.length}...`
            : embedded?.scoreLocked === true
              ? "Lưu nhận xét"
              : "Lưu"}
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
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted">
        Có thể duyệt {bulkApprovableIds.length} hồ sơ
        <HelpTip label="Giải thích duyệt hàng loạt">
          Duyệt hàng loạt chỉ áp dụng cho hồ sơ đủ điều kiện. Hồ sơ ngoại lệ phải duyệt riêng từng hồ sơ để xem thông tin và chọn cấp độ đạt được; từ chối hàng loạt vẫn áp dụng cho mọi hồ sơ đang chờ.
        </HelpTip>
      </span>
      <Tip disabled={bulkApprovableIds.length === 0} label="Duyệt các hồ sơ đang chờ hoặc duyệt lại hồ sơ bị từ chối (khóa đã kết thúc sẽ bị bỏ qua)">
        <Button disabled={bulkApprovableIds.length === 0} onClick={() => setBulkMode("approve")} size="sm" type="button">
          Duyệt đã chọn
        </Button>
      </Tip>
      <Tip disabled={bulkRejectableIds.length === 0} label="Từ chối các hồ sơ đang chờ, bắt buộc nhập lý do (khóa đã kết thúc sẽ bị bỏ qua)">
        <Button disabled={bulkRejectableIds.length === 0} onClick={() => setBulkMode("reject")} size="sm" type="button" variant="outline">
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

  // Xuất Excel theo đúng bộ lọc/tìm kiếm/sắp xếp đang dùng (cả danh sách lẻ lẫn tab trong khóa).
  const exportEndpoint = config.exportEndpoint ?? effectiveRoute.endpoint;
  const excelExportButton =
    exportEndpoint && EXCEL_EXPORT_FILES[exportEndpoint] ? (
      <ExcelExportButton empty={query.isLoading || query.isError || rows.length === 0} endpoint={exportEndpoint} queryString={queryState.queryString} />
    ) : null;
  // Import Excel: hồ sơ huynh trưởng (quyền tạo huynh trưởng) và danh sách tham dự của khóa quá khứ (quyền riêng do super-admin cấp).
  // Khóa quá khứ: quyền create_past do super-admin cấp; khóa thường: người duyệt đăng ký (khóa chưa kết thúc).
  const canImportParticipants =
    embedded?.coursePast === true
      ? hasPermissionPrefix(user, "training.course.create_past.")
      : hasPermissionPrefix(user, "training.participation.approve.") && embedded?.courseFinished !== true;
  const excelImportButton =
    !embedded && effectiveRoute.kind === "leaders" && effectiveRoute.endpoint === "/leaders" && canCreate ? (
      <ExcelImportDialog
        description="Tạo nhiều huynh trưởng cùng lúc từ file Excel mẫu. Chỉ cần một dòng sai thì không có huynh trưởng nào được lưu."
        endpoint="/leaders/import"
        templateFileName="mau-import-ho-so-huynh-truong.xlsx"
        templatePath="/leaders/import-template"
        hint="Mọi cột đều bắt buộc trừ Cấp độ (để trống là Chưa có cấp): Tên thánh, Họ và tên, Ngày sinh (dd/MM/yyyy), Giới tính (Nam/Nữ), Email, Số điện thoại, Giáo hạt, Giáo xứ. Giáo hạt và giáo xứ phải đã có trong hệ thống. Email và số điện thoại không được trùng với huynh trưởng khác."
        title="Nhập excel hồ sơ huynh trưởng"
      />
    ) : embedded?.tab === "participations" && effectiveRoute.endpoint === "/training/participants" && scoreCourseCode && !courseDisabled && canImportParticipants ? (
      <ExcelImportDialog
        description={
          embedded.coursePast === true
            ? "Nhập danh sách tham dự của khóa quá khứ kèm điểm và kết quả. Huynh trưởng được tìm theo email hoặc số điện thoại; chưa có hồ sơ thì tạo mới ngay từ thông tin trong file."
            : "Nhập danh sách tham dự của khóa từ file Excel mẫu. Huynh trưởng được tìm theo email hoặc số điện thoại; chưa có hồ sơ thì tạo mới ngay từ thông tin trong file."
        }
        endpoint={`/training/courses/${encodeURIComponent(scoreCourseCode)}/participants/import`}
        templateFileName={embedded.coursePast === true ? "mau-import-danh-sach-tham-du-khoa-qua-khu.xlsx" : "mau-import-danh-sach-tham-du.xlsx"}
        templatePath={embedded.coursePast === true ? "/training/courses/past/import-template" : "/training/courses/participants/import-template"}
        hint={
          embedded.coursePast === true
            ? "Mọi dòng phải nhập đủ các cột, chỉ được bỏ trống Nhận xét và Cấp độ: Email, Số điện thoại, Tổng điểm, Kết quả (Đạt / Không đạt), Tên thánh, Họ và tên, Ngày sinh, Giới tính, Giáo hạt, Giáo xứ (giáo hạt, giáo xứ phải đã có trong hệ thống). Huynh trưởng đã có hồ sơ thì chỉ được thêm vào khóa (hồ sơ không bị sửa); chưa có thì được tạo mới từ chính dòng đó. Học viên Đạt của khóa có cấp độ đạt được sẽ chuyển sang tab Duyệt chứng nhận."
            : "Sheet \"Danh sách tham dự\" cho huynh trưởng đủ điều kiện của khóa (vào thẳng danh sách tham dự), sheet \"Ngoại lệ\" cho huynh trưởng không đủ điều kiện (vào danh sách chờ duyệt đăng ký, gắn cờ ngoại lệ, thêm cột Lí do ngoại lệ). Mọi dòng phải nhập đủ các cột, chỉ được bỏ trống Cấp độ: Email, Số điện thoại, Tên thánh, Họ và tên, Ngày sinh, Giới tính, Giáo hạt, Giáo xứ (giáo hạt, giáo xứ phải đã có trong hệ thống). Huynh trưởng đã có hồ sơ thì chỉ được thêm vào khóa (hồ sơ không bị sửa); chưa có thì được tạo mới từ chính dòng đó. Không cần điểm: điểm được chấm ở tab Chấm điểm."
        }
        title="Nhập excel danh sách tham dự"
        triggerLabel="Nhập excel danh sách tham dự"
      />
    ) : null;

  return (
    <div className="space-y-6">
      <ResourceListHeader
        moduleLabel={config.moduleLabel}
        moduleHref={config.moduleHref}
        route={effectiveRoute}
        embedded={Boolean(embedded)}
        actions={
          !embedded && effectiveRoute.primaryActionLabel && effectiveRoute.createPath && canCreate ? (
            <Button asChild>
              <Link href={effectiveRoute.createPath as Route}>
                <Plus size={18} weight="bold" />
                {effectiveRoute.primaryActionLabel}
              </Link>
            </Button>
          ) : null
        }
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
          showCreate={Boolean(embedded)}
          extraActions={
            <>
              {config.toolbarActions}
              {excelExportButton}
              {excelImportButton}
              {config.cardView && !embedded ? <ViewModeToggle mode={viewMode} onChange={setViewMode} /> : null}
              {saveScoresButton}
              {permissionRevokeButton}
            </>
          }
          leadingActions={selectedIds.length > 0 && (bulkActions || exportActions) ? <>{bulkActions}{exportActions}</> : scoreStats}
        />
        {scoreEntryEnabled && embedded?.scoreLocked === true ? (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs font-medium text-foreground">Điểm của khóa đang bị khóa chỉnh sửa. Cần mở khóa mới nhập được điểm.</div>
        ) : null}
        {scoreEntryEnabled && embedded?.scoringOpen === false ? (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs font-medium text-foreground">{embedded.scoringHint ?? "Chỉ chấm điểm được khi khóa đang diễn ra."}</div>
        ) : null}
        {showCards && config.cardView ? (
          config.cardView.render({ rows, route: effectiveRoute, isLoading: query.isLoading, selection, onExportRow: canExportPdf ? (id) => exportPdf([id]) : undefined, exportingRow: exporting })
        ) : (
        <ResourceTable
          selection={selection}
          onExportRow={canExportPdf ? (id) => exportPdf([id]) : undefined}
          exportingRow={exporting}
          scoreEntry={scoreEntry}
          cellEditors={config.cellEditors}
          page={queryState.page}
          isLoading={query.isLoading}
          route={effectiveRoute}
          rows={rows}
          size={queryState.size}
          sort={queryState.sort}
          sortBy={queryState.sortBy}
          sortDirection={queryState.sortDirection}
        />
        )}

        {!query.isLoading && rows.length === 0 ? <ResourceListEmptyState route={effectiveRoute} /> : null}

        {query.isError && !query.isFetching ? (
          <div className="mx-4 mb-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm font-medium text-danger">
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
      {effectiveRoute.kind === "executive-board" ? <AssignmentFormDialog onClose={closeQueryDialog} target={assignmentFormTarget} /> : null}
      {effectiveRoute.kind === "courses" ? (
        // Khóa huấn luyện: cảnh báo tác động lên chứng nhận, xác nhận và đối chiếu trạng thái đích ở BE.
        <CourseStatusDialog
          courseCode={toggleId}
          courseName={toggleId ? String(rowById(toggleId)?.courseName ?? "") : undefined}
          endpoint={effectiveRoute.endpoint ?? "/training/courses"}
          onClose={closeQueryDialog}
        />
      ) : effectiveRoute.kind === "dioceses" || effectiveRoute.kind === "deaneries" || effectiveRoute.kind === "parishes" ? (
        // Giáo phận / giáo hạt / giáo xứ: bảng tác động, lý do bắt buộc khi tắt và lịch sử trạng thái.
        <UnitToggleDialog
          endpoint={effectiveRoute.endpoint ?? `/${effectiveRoute.kind}`}
          onClose={closeQueryDialog}
          unitId={toggleId}
          unitLabel={effectiveRoute.kind === "dioceses" ? "giáo phận" : effectiveRoute.kind === "deaneries" ? "giáo hạt" : "giáo xứ"}
          unitName={toggleId ? String(rowById(toggleId)?.name ?? "") : undefined}
        />
      ) : (
        <ConfirmActionDialog
          action="toggle"
          loading={actionMutation.isPending}
          onClose={closeQueryDialog}
          onConfirm={() => toggleId && actionMutation.mutate({ action: "toggle", id: toggleId })}
          open={Boolean(toggleId)}
          title={effectiveRoute.kind === "executive-board" ? "Vô hiệu hóa phân công" : "Đổi trạng thái bản ghi"}
          description={
            effectiveRoute.kind === "executive-board"
              ? "Phân công sẽ kết thúc từ hôm nay và không bật lại được (nhiệm kì được giữ lại trong lịch sử). Muốn huynh trưởng giữ chức vụ trở lại, hãy tạo phân công mới. Nhập chính xác Xác nhận để tiếp tục."
              : undefined
          }
        />
      )}
      <ApprovalDialog
        key={approveId ?? "approve-closed"}
        captureSigner={config.captureSigner}
        exceptionItems={approveExceptionItems}
        exceptionReasons={approveId ? exceptionReasonsOf([approveId]) : undefined}
        exceptionProfile={approveId ? exceptionProfileFor(approveId) : null}
        requireApprovalDate={Boolean(approveId && rowById(approveId)?.coursePast === true)}
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={(note, _reasons, signer, achievedLevels) => approveId && actionMutation.mutate({ action: "approve", id: approveId, note, signer, achievedLevel: achievedLevels?.[approveId] })}
        open={Boolean(approveId)}
      />
      <ApprovalDialog
        key={bulkMode ?? "bulk-closed"}
        captureSigner={config.captureSigner}
        exceptionItems={bulkExceptionItems}
        exceptionReasons={bulkMode ? exceptionReasonsOf(bulkTargetIds) : undefined}
        requireApprovalDate={bulkMode === "approve" && bulkTargetIds.some((id) => rowById(id)?.coursePast === true)}
        loading={bulkMutation.isPending}
        mode={bulkMode === "reject" ? "reject" : "approve"}
        onClose={() => setBulkMode(null)}
        onConfirm={(note, reasons, signer, achievedLevels) => bulkMode && bulkMutation.mutate({ approved: bulkMode === "approve", note, reasons, signer, achievedLevels })}
        items={bulkTargetIds.map((id) => {
          const row = rowById(id);
          return { id, label: String(row?.leaderFullName ?? id) };
        })}
        open={bulkMode !== null}
      />
      <ConfirmActionDialog
        action="withdraw"
        confirmLabel="Đặt lại"
        description="Hệ thống tạo mật khẩu tạm 8 ký tự rồi gửi tới email đăng ký của tài khoản hoặc email của huynh trưởng gắn với tài khoản. Mật khẩu chỉ có hiệu lực 10 phút, người dùng phải đổi mật khẩu khi đăng nhập và mọi phiên đăng nhập hiện tại bị đăng xuất. Nhập chính xác Xác nhận để tiếp tục."
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => resetPasswordId && actionMutation.mutate({ action: "resetPassword", id: resetPasswordId })}
        open={Boolean(resetPasswordId)}
        title={resetPasswordId ? `Đặt lại mật khẩu tài khoản ${resetPasswordId}` : "Đặt lại mật khẩu"}
      />
      <ConfirmActionDialog
        action="withdraw"
        confirmLabel="Thu hồi"
        description="Quyền bị thu hồi vĩnh viễn và không bật lại được; muốn cấp lại phải phân quyền mới."
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => revokePermissionId && actionMutation.mutate({ action: "revokePermission", id: revokePermissionId })}
        open={Boolean(revokePermissionId)}
        requireConfirmText={false}
        title="Thu hồi quyền"
      />
      <ConfirmActionDialog
        action="withdraw"
        confirmLabel={embedded?.coursePast === true ? "Xóa khỏi khóa" : "Chuyển"}
        description={
          embedded?.coursePast === true
            ? "Học viên (và chứng nhận chờ duyệt của học viên) sẽ bị xóa khỏi khóa quá khứ; có thể import lại nếu nhập nhầm. Không xóa được học viên đã có chứng nhận được duyệt, hãy thu hồi chứng nhận trước."
            : "Hồ sơ sẽ chuyển về trạng thái từ chối duyệt đăng ký (không bị xóa hẳn) và điểm đã nhập sẽ bị xóa. Có thể duyệt lại ở màn Duyệt đăng ký. Không xử lý được hồ sơ đã có chứng nhận."
        }
        loading={actionMutation.isPending}
        onClose={closeQueryDialog}
        onConfirm={() => removeId && actionMutation.mutate({ action: "remove", id: removeId })}
        open={Boolean(removeId)}
        requireConfirmText={false}
        title={embedded?.coursePast === true ? "Xóa học viên khỏi khóa quá khứ" : "Chuyển hồ sơ về trạng thái từ chối duyệt"}
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
        exceptionReasons={rejectId ? exceptionReasonsOf([rejectId]) : undefined}
        loading={actionMutation.isPending}
        mode="reject"
        onClose={closeQueryDialog}
        onConfirm={(note) => rejectId && actionMutation.mutate({ action: "reject", id: rejectId, note })}
        open={Boolean(rejectId)}
      />
    </div>
  );
}
