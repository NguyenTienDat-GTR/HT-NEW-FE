"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CopySimple, X } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CourseCopySourcesField, type CopyMode } from "@/components/form/resource-form/course-copy-sources-field";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { invalidateDataQueries } from "@/lib/api/query-keys";
import type { CopyResult } from "@/modules/prerequisite-copy/types";

// Nút ở tab Danh sách tham dự: sao chép hồ sơ từ khóa nguồn bất kỳ (đã kết thúc hoặc khóa quá khứ) vào khóa này ngay lập tức.
// Chọn khóa nguồn (mặc định các khóa trong vòng 2 năm tính từ năm tổ chức khóa này), cách sao chép hoặc từng huynh trưởng cụ thể.
export function CopyParticipantsDialog({ courseCode, targetYear }: { courseCode: string; targetYear: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sourceCodes, setSourceCodes] = useState<string[]>([]);
  const [mode, setMode] = useState<CopyMode>("ALL");
  const [leaderIds, setLeaderIds] = useState<string[] | undefined>(undefined);

  const copy = useMutation({
    mutationFn: () =>
      apiMutation<CopyResult>(`/training/courses/${encodeURIComponent(courseCode)}/participants-copy`, "POST", {
        sourceCourseCodes: sourceCodes,
        copyMode: mode,
        leaderIds: leaderIds && leaderIds.length > 0 ? leaderIds : undefined,
      }),
    onSuccess: async (result) => {
      toast.success(`Đã sao chép ${result.copied} hồ sơ vào danh sách tham dự`);
      if (result.skipped.length > 0) {
        toast.warning(`${result.skipped.length} hồ sơ không được sao chép: ${result.skipped[0].reason}${result.skipped.length > 1 ? "…" : ""}`);
      }
      close();
      await invalidateDataQueries(queryClient);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function close() {
    setOpen(false);
    setSourceCodes([]);
    setMode("ALL");
    setLeaderIds(undefined);
  }

  return (
    <Dialog.Root onOpenChange={(next) => (next ? setOpen(true) : close())} open={open}>
      <Dialog.Trigger asChild>
        <Button size="sm" type="button" variant="outline">
          <CopySimple size={16} />
          Sao chép từ khóa nguồn
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] max-w-[820px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-white p-5 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Sao chép danh sách tham dự từ khóa nguồn
                <HelpTip>
                  Đưa huynh trưởng từ danh sách tham dự của khóa đã kết thúc (hoặc khóa quá khứ) vào khóa này, không cần đăng ký lại. Hồ sơ vào thẳng danh sách tham dự (đã duyệt). Khóa bật “Tự gửi email thông tin tham dự” thì người vừa được sao chép sẽ được gửi email ngay.
                </HelpTip>
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">Chọn khóa nguồn, rồi chọn cách sao chép hoặc từng huynh trưởng cụ thể.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="icon">
                <X size={16} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <CourseCopySourcesField
              courseCode={courseCode}
              leaderIds={leaderIds}
              mode={mode}
              onLeaderIdsChange={setLeaderIds}
              onModeChange={(next) => {
                setMode(next);
                setLeaderIds(undefined);
              }}
              onSelectedChange={(codes) => {
                setSourceCodes(codes);
                setLeaderIds(undefined);
              }}
              selected={sourceCodes}
              targetYear={targetYear}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={close} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={sourceCodes.length === 0} loading={copy.isPending} onClick={() => copy.mutate()} type="button">
              Sao chép
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
