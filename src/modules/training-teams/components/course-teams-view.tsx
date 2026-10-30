"use client";

import { FloppyDisk, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/common/resource/confirm-action-dialog";
import { useEmbeddedResource } from "@/components/common/resource/embedded-resource-context";
import { ExcelImportDialog } from "@/components/common/resource/excel-import-dialog";
import { Button } from "@/components/ui/button";
import type { RouteConfig } from "@/config/routes/routes";
import { apiFetch, apiMutation } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { TrainingWorkflowResourceView } from "@/modules/training-workflow/components/training-workflow-resource-view";
import type { TeamOverview } from "../types";
import { TeamDivideDialog } from "./team-divide-dialog";
import { TeamNameCell, teamSuggestions } from "./team-name-cell";
import { TeamOverviewPanel } from "./team-overview-panel";
import { resourceKey } from "@/lib/api/query-keys";

// Tab "Chia đội" của khóa thường: tóm tắt đội, danh sách tham dự kèm đội (lọc theo đội), nút chia đội và import excel chia đội.
export function CourseTeamsView({ route }: { route: RouteConfig }) {
  const embedded = useEmbeddedResource();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const courseCode = embedded?.fixedFilters["course.courseCode"] ?? "";
  const [clearOpen, setClearOpen] = useState(false);

  // Người duyệt đăng ký của đơn vị sở hữu khóa chia đội được khi khóa còn hoạt động và chưa kết thúc.
  const canManage = hasPermissionPrefix(user, "training.participation.approve.") && embedded?.courseFinished !== true && embedded?.courseDisabled !== true;
  // Khóa `resourceKey(...)` để nhận làm mới cùng danh sách sau khi import / chia đội.
  const overviewQuery = useQuery({
    queryKey: resourceKey("team-overview", courseCode),
    enabled: Boolean(courseCode),
    queryFn: () => apiFetch<TeamOverview>(`/training/courses/${encodeURIComponent(courseCode)}/teams/overview`),
  });
  const overview = overviewQuery.data;

  // Gán đội thủ công: bản nháp theo id hồ sơ (giống nhập điểm), chỉ gửi khi bấm Lưu.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const datalistId = useId();
  const suggestions = useMemo(() => teamSuggestions(overview?.teams.map((team) => team.teamName) ?? [], drafts), [overview, drafts]);
  const draftIds = Object.keys(drafts);

  function changeDraft(row: Record<string, unknown>, value: string) {
    const id = String(row.id ?? "");
    const original = typeof row.teamName === "string" ? row.teamName : "";
    setDrafts((current) => {
      const next = { ...current };
      if (value.trim() === original) delete next[id];
      else next[id] = value;
      return next;
    });
  }

  const save = useMutation({
    mutationFn: () =>
      apiMutation(`/training/courses/${encodeURIComponent(courseCode)}/teams/assignments`, "PATCH", {
        assignments: draftIds.map((id) => ({ participationId: id, teamName: drafts[id].trim() })),
      }),
    onSuccess: async () => {
      toast.success("Đã lưu đội cho hồ sơ");
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: resourceKey() });
    },
  });

  const cellEditors = canManage
    ? {
        teamName: (row: Record<string, unknown>) => (
          <TeamNameCell
            datalistId={datalistId}
            draft={drafts[String(row.id ?? "")]}
            label={String(row.leaderFullName ?? "")}
            onChange={(value) => changeDraft(row, value)}
            original={typeof row.teamName === "string" ? row.teamName : ""}
          />
        ),
      }
    : undefined;

  const clear = useMutation({
    mutationFn: () => apiMutation(`/training/courses/${encodeURIComponent(courseCode)}/teams`, "DELETE"),
    onSuccess: async () => {
      toast.success("Đã xóa chia đội của khóa");
      setClearOpen(false);
      await queryClient.invalidateQueries({ queryKey: resourceKey() });
    },
  });

  const toolbarActions = canManage ? (
    <>
      <Button disabled={draftIds.length === 0} loading={save.isPending} onClick={() => save.mutate()} type="button">
        <FloppyDisk size={18} />
        {draftIds.length > 0 ? `Lưu đội (${draftIds.length})` : "Lưu đội"}
      </Button>
      {overview ? <TeamDivideDialog courseCode={courseCode} overview={overview} /> : null}
      <ExcelImportDialog
        description="Nhập danh sách chia đội của khóa từ file Excel mẫu: giống danh sách tham dự nhưng thêm cột Tên đội, không có sheet Ngoại lệ. Huynh trưởng được tìm theo email hoặc số điện thoại; chưa có hồ sơ thì tạo mới ngay từ thông tin trong file."
        endpoint={`/training/courses/${encodeURIComponent(courseCode)}/teams/import`}
        hint="Mọi dòng phải nhập đủ các cột, chỉ được bỏ trống Cấp độ: Email, Số điện thoại, Tên thánh, Họ và tên, Ngày sinh, Giới tính, Giáo hạt, Giáo xứ, Tên đội. Hồ sơ được import mặc định là đã duyệt đăng ký (vào thẳng danh sách tham dự, không kiểm tra điều kiện của khóa) và gắn vào đội theo cột Tên đội. Huynh trưởng đã có hồ sơ chỉ được thêm vào khóa; một dòng sai thì không có hồ sơ nào được lưu."
        templateFileName="mau-import-danh-sach-chia-doi.xlsx"
        templatePath="/training/courses/teams/import-template"
        title="Nhập excel chia đội"
        triggerLabel="Nhập excel chia đội"
      />
      {overview && overview.dividedParticipants > 0 ? (
        <Button onClick={() => setClearOpen(true)} type="button" variant="outline">
          <Trash size={18} />
          Xóa chia đội
        </Button>
      ) : null}
    </>
  ) : null;

  return (
    <div className="space-y-4">
      {overview ? <TeamOverviewPanel overview={overview} /> : null}
      <datalist id={datalistId}>
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <TrainingWorkflowResourceView cellEditors={cellEditors} exportEndpoint="/training/participants/teams" route={route} toolbarActions={toolbarActions} />
      <ConfirmActionDialog
        action="toggle"
        confirmLabel="Xóa chia đội"
        description="Toàn bộ hồ sơ sẽ không còn thuộc đội nào. Danh sách tham dự không bị thay đổi."
        loading={clear.isPending}
        onClose={() => setClearOpen(false)}
        onConfirm={() => clear.mutate()}
        open={clearOpen}
        requireConfirmText={false}
        title="Xóa chia đội của khóa"
      />
    </div>
  );
}
