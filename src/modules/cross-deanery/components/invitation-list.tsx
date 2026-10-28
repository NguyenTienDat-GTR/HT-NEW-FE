"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/common/resource/resource-format";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { apiFetch, apiMutation } from "@/lib/api/client";
import { formatVietnamDateValue } from "@/lib/date-format";
import { accessLabels, accessTones, type CourseInvitation } from "../types";
import { CourseInfoBlock } from "./course-info";

// Khóa của giáo hạt khác mở liên giáo hạt: giáo hạt nhà xem thông tin khóa rồi cho phép / từ chối giáo xứ của mình gửi hồ sơ.
export function InvitationList() {
  const queryClient = useQueryClient();
  const [denying, setDenying] = useState<CourseInvitation | null>(null);

  const query = useQuery({
    queryKey: ["cross-deanery", "invitations"],
    queryFn: () => apiFetch<CourseInvitation[]>("/training/cross-deanery/course-invitations"),
  });
  const invitations = query.data ?? [];

  const decide = useMutation({
    mutationFn: (body: { courseCode: string; allowed: boolean; note: string }) =>
      apiMutation<CourseInvitation>(`/training/cross-deanery/course-invitations/${encodeURIComponent(body.courseCode)}/decision`, "POST", {
        allowed: body.allowed,
        note: body.note || undefined,
      }),
    onSuccess: async (_data, body) => {
      toast.success(body.allowed ? "Đã cho phép giáo xứ gửi hồ sơ sang khóa này" : "Đã từ chối cho giáo xứ gửi hồ sơ sang khóa này");
      setDenying(null);
      await queryClient.invalidateQueries({ queryKey: ["cross-deanery"] });
    },
  });

  return (
    <div className="space-y-4">
      {query.isLoading ? <Panel className="p-6 text-sm text-muted">Đang tải…</Panel> : null}
      {!query.isLoading && invitations.length === 0 ? (
        <Panel className="p-6 text-sm text-muted">Hiện chưa có giáo hạt nào mở khóa cho các giáo hạt khác trong giáo phận.</Panel>
      ) : null}

      {invitations.map((item) => (
        <Panel className="space-y-3 p-4" key={item.courseCode}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {item.courseName} <span className="font-normal text-muted">({item.hostDeaneryName})</span>
              </p>
              {item.decidedAt ? (
                <p className="text-xs text-muted">
                  {[item.decidedByName ? `Người quyết định: ${item.decidedByName}` : null, formatVietnamDateValue(item.decidedAt)].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
            <Badge tone={accessTones[item.decision]}>{accessLabels[item.decision]}</Badge>
          </div>
          <CourseInfoBlock hostDeaneryName={item.hostDeaneryName} info={item.course} />
          {item.decisionNote ? <p className="text-xs text-muted">Ghi chú: {item.decisionNote}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {item.registrationClosed ? <span className="text-xs text-muted">Khóa đã đóng đăng ký</span> : null}
            {item.canDecide && item.decision !== "DENIED" ? (
              <Button onClick={() => setDenying(item)} type="button" variant="destructive">
                Từ chối
              </Button>
            ) : null}
            {item.canDecide && item.decision !== "ALLOWED" ? (
              <Button loading={decide.isPending && decide.variables?.courseCode === item.courseCode} onClick={() => decide.mutate({ courseCode: item.courseCode, allowed: true, note: "" })} type="button">
                Cho phép giáo xứ gửi
              </Button>
            ) : null}
          </div>
        </Panel>
      ))}

      {denying ? (
        <DenyDialog invitation={denying} loading={decide.isPending} onClose={() => setDenying(null)} onSubmit={(note) => decide.mutate({ courseCode: denying.courseCode, allowed: false, note })} />
      ) : null}
    </div>
  );
}

function DenyDialog({ invitation, loading, onClose, onSubmit }: { invitation: CourseInvitation; loading?: boolean; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Dialog.Root onOpenChange={(open) => (open ? undefined : onClose())} open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Từ chối khóa {invitation.courseName}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">Giáo xứ thuộc giáo hạt của bạn sẽ không gửi được hồ sơ sang khóa này.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.02em] text-muted">
              Lí do <span className="text-danger">*</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]"
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                value={note}
              />
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
            <Button onClick={onClose} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={note.trim().length === 0} loading={loading} onClick={() => onSubmit(note.trim())} type="button" variant="destructive">
              Từ chối
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
