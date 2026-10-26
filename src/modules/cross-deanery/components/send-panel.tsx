"use client";

import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { apiFetch, apiMutation } from "@/lib/api/client";
import { formatVietnamDateValue } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { buildItems, candidateName, emptyDraft, missingReasons } from "../send-form";
import type { Candidate, CrossRequest, ItemDraft, OpenCourse } from "../types";

const fieldClass =
  "w-full rounded-[8px] border border-border bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]";

// Gửi huynh trưởng của giáo xứ / giáo hạt mình sang khóa giáo hạt của giáo hạt khác (cùng giáo phận). Mỗi hồ sơ phải có lí do riêng.
export function SendPanel({ onSent }: { onSent: () => void }) {
  const queryClient = useQueryClient();
  const [courseCode, setCourseCode] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [search, setSearch] = useState("");

  const coursesQuery = useQuery({
    queryKey: ["cross-deanery", "courses"],
    queryFn: () => apiFetch<OpenCourse[]>("/training/cross-deanery/courses"),
  });
  const courses = coursesQuery.data ?? [];
  const course = courses.find((item) => item.courseCode === courseCode);

  const candidatesQuery = useQuery({
    queryKey: ["cross-deanery", "candidates", courseCode],
    enabled: Boolean(courseCode),
    queryFn: () => apiFetch<Candidate[]>(`/training/cross-deanery/courses/${encodeURIComponent(courseCode)}/candidates`),
  });
  const candidates = useMemo(() => (courseCode ? (candidatesQuery.data ?? []) : []), [courseCode, candidatesQuery.data]);
  const keyword = search.trim().toLowerCase();
  const visible = candidates.filter((item) => !keyword || `${candidateName(item)} ${item.parishName}`.toLowerCase().includes(keyword));
  const chosen = candidates.filter((item) => selected[item.leaderId] && !item.blockedReason);
  const missing = missingReasons(chosen, drafts);

  const send = useMutation({
    mutationFn: () => apiMutation<CrossRequest>(`/training/cross-deanery/courses/${encodeURIComponent(courseCode)}/requests`, "POST", { items: buildItems(chosen, drafts) }),
    onSuccess: async (result) => {
      toast.success(result.requestStatus === "APPROVED" ? "Đã gửi hồ sơ sang giáo hạt khác, chờ giáo hạt tổ chức khóa duyệt" : "Đã gửi yêu cầu, chờ giáo hạt nhà đồng ý");
      setSelected({});
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: ["cross-deanery"] });
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      onSent();
    },
  });

  function updateDraft(leaderId: string, patch: Partial<ItemDraft>) {
    setDrafts((current) => ({ ...current, [leaderId]: { ...(current[leaderId] ?? emptyDraft), ...patch } }));
  }

  return (
    <div className="space-y-4">
      <Panel className="space-y-3 p-4">
        <label className="block max-w-xl">
          <span className="mb-1.5 block text-[13px] font-semibold text-foreground">Khóa của giáo hạt khác (đang mở đăng ký)</span>
          <select
            className="h-10 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)]"
            onChange={(event) => {
              setCourseCode(event.target.value);
              setSelected({});
              setDrafts({});
            }}
            value={courseCode}
          >
            <option value="">{coursesQuery.isLoading ? "Đang tải…" : courses.length ? "Chọn khóa" : "Hiện không có khóa nào của giáo hạt khác đang mở đăng ký"}</option>
            {courses.map((item) => (
              <option key={item.courseCode} value={item.courseCode}>
                {item.courseName} — {item.deaneryName}
              </option>
            ))}
          </select>
        </label>
        {course ? (
          <p className="text-xs text-muted">
            {[course.courseTypeName, `Tổ chức bởi ${course.deaneryName}`, course.startDate ? `Bắt đầu ${formatVietnamDateValue(course.startDate)}` : null, course.registrationEndAt ? `Hạn đăng ký ${formatVietnamDateValue(course.registrationEndAt)}` : null]
              .filter(Boolean)
              .join(" · ")}
            . Hồ sơ phải được giáo hạt nhà đồng ý trước, sau đó giáo hạt tổ chức khóa duyệt thủ công (không tự duyệt).
          </p>
        ) : null}
      </Panel>

      {courseCode ? (
        <Panel className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Chọn huynh trưởng ({chosen.length} đã chọn)</h2>
            <Input className="h-9 w-64" onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, giáo xứ" value={search} />
          </div>
          {candidatesQuery.isLoading ? <p className="text-sm text-muted">Đang tải danh sách…</p> : null}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {visible.map((item) => {
              const blocked = Boolean(item.blockedReason);
              const checked = Boolean(selected[item.leaderId]) && !blocked;
              const draft = drafts[item.leaderId] ?? emptyDraft;
              return (
                <li className={cn("px-3 py-2.5 text-sm", blocked && "bg-surface-1/60 text-muted")} key={item.leaderId}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      checked={checked}
                      className="mt-1 h-4 w-4 accent-primary"
                      disabled={blocked}
                      onChange={(event) => setSelected((current) => ({ ...current, [item.leaderId]: event.target.checked }))}
                      type="checkbox"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("font-semibold", blocked ? "text-muted" : "text-foreground")}>{candidateName(item)}</span>
                      <span className="ml-2 text-xs text-muted">{item.parishName}</span>
                      {blocked ? <span className="ml-2 text-xs font-medium text-text-secondary">{item.blockedReason}</span> : null}
                      {!blocked && !item.eligible ? <span className="ml-2 text-xs font-medium text-warning">Chưa đủ điều kiện của khóa (gửi dạng ngoại lệ)</span> : null}
                    </span>
                  </label>
                  {checked ? (
                    <div className="mt-2 grid gap-2 pl-7 md:grid-cols-2">
                      <label className="block text-xs font-semibold text-muted">
                        Lí do gửi sang giáo hạt khác <span className="text-danger">*</span>
                        <textarea
                          className={cn(fieldClass, "mt-1 min-h-14 font-normal")}
                          maxLength={500}
                          onChange={(event) => updateDraft(item.leaderId, { reason: event.target.value })}
                          value={draft.reason}
                        />
                      </label>
                      {!item.eligible ? (
                        <label className="block text-xs font-semibold text-muted">
                          Lí do ngoại lệ <span className="text-danger">*</span>
                          <textarea
                            className={cn(fieldClass, "mt-1 min-h-14 font-normal")}
                            maxLength={500}
                            onChange={(event) => updateDraft(item.leaderId, { exceptionReason: event.target.value })}
                            value={draft.exceptionReason}
                          />
                        </label>
                      ) : null}
                      <label className="block text-xs font-semibold text-muted md:col-span-2">
                        Ghi chú (tùy chọn)
                        <input
                          className={cn(fieldClass, "mt-1 font-normal")}
                          maxLength={1000}
                          onChange={(event) => updateDraft(item.leaderId, { note: event.target.value })}
                          value={draft.note}
                        />
                      </label>
                    </div>
                  ) : null}
                </li>
              );
            })}
            {!candidatesQuery.isLoading && visible.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">Không có huynh trưởng phù hợp.</li> : null}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-danger">{chosen.length > 0 && missing.length > 0 ? `Còn ${missing.length} hồ sơ thiếu lí do` : ""}</span>
            <Button disabled={chosen.length === 0 || missing.length > 0} loading={send.isPending} onClick={() => send.mutate()} type="button">
              <PaperPlaneTilt size={18} />
              Gửi {chosen.length > 0 ? `${chosen.length} hồ sơ` : ""}
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
