"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Warning, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  DuplicateDecision,
  ExcelJob,
  ImportDuplicate,
} from "@/lib/jobs/excel-jobs-client";

type Props = {
  job: ExcelJob;
  duplicates: ImportDuplicate[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (decisions: DuplicateDecision[]) => void;
};

// "different": hai người khác nhau; còn lại là id hồ sơ đã có mà dòng này được xác nhận là cùng một người.
type Choice = "different" | string;

const rowKey = (item: ImportDuplicate) => `${item.sheet}#${item.row}`;

// Hộp thoại xác nhận hồ sơ nghi trùng sau khi import: các hồ sơ không trùng đã được import, các dòng nghi trùng (cùng tên thánh, họ tên,
// ngày sinh, giáo xứ với hồ sơ đã có nhưng khác số điện thoại) chờ người dùng cho biết là cùng một người hay hai người khác nhau.
export function ImportDuplicatesDialog({
  job,
  duplicates,
  submitting,
  onClose,
  onSubmit,
}: Props) {
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const leaderImport = job.kind === "IMPORT_LEADERS";
  const decided = duplicates.filter(
    (item) => choices[rowKey(item)] !== undefined,
  ).length;
  const allDecided = decided === duplicates.length;

  function choose(item: ImportDuplicate, choice: Choice) {
    setChoices((current) => ({ ...current, [rowKey(item)]: choice }));
  }

  function chooseAll(kind: "same" | "different") {
    const next: Record<string, Choice> = {};
    for (const item of duplicates) {
      if (kind === "different") next[rowKey(item)] = "different";
      else if (item.existing.length === 1)
        next[rowKey(item)] = item.existing[0].id;
    }
    setChoices((current) => ({ ...current, ...next }));
  }

  function submit() {
    onSubmit(
      duplicates.map((item) => {
        const choice = choices[rowKey(item)];
        return {
          sheet: item.sheet,
          row: item.row,
          sameLeaderId: choice === "different" ? null : choice,
        };
      }),
    );
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => (!next && !submitting ? onClose() : undefined)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,760px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
                <Warning size={20} weight="bold" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  Xác nhận hồ sơ nghi trùng
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                  Các hồ sơ còn lại đã được import. {duplicates.length} dòng
                  dưới đây trùng tên thánh, họ và tên, ngày sinh và giáo xứ với
                  hồ sơ đã có trong hệ thống nhưng khác số điện thoại. Hãy cho
                  biết đó là cùng một người hay hai người khác nhau.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button
                aria-label="Đóng"
                disabled={submitting}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <span>
              Đã chọn {decided}/{duplicates.length}
            </span>
            <Button
              onClick={() => chooseAll("same")}
              size="sm"
              type="button"
              variant="outline"
            >
              Tất cả là cùng một người
            </Button>
            <Button
              onClick={() => chooseAll("different")}
              size="sm"
              type="button"
              variant="outline"
            >
              Tất cả là hai người khác nhau
            </Button>
          </div>

          <ul
            className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
            data-testid="import-duplicates-list"
          >
            {duplicates.map((item) => {
              const key = rowKey(item);
              const name = `duplicate-${key}`;
              return (
                <li className="rounded-lg border border-border p-3" key={key}>
                  <p className="text-sm font-semibold text-foreground">
                    {item.holyName} {item.fullName}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {item.sheet} · dòng {item.row} · sinh {item.birthDate} ·
                    giáo xứ {item.parish} · số điện thoại trong file{" "}
                    {item.phone}
                  </p>
                  <fieldset className="mt-2 space-y-1.5 text-sm">
                    <legend className="sr-only">
                      Quyết định cho dòng {item.row}
                    </legend>
                    {item.existing.map((existing) => (
                      <label
                        className="flex cursor-pointer items-start gap-2"
                        key={existing.id}
                      >
                        <input
                          checked={choices[key] === existing.id}
                          className="mt-1"
                          name={name}
                          onChange={() => choose(item, existing.id)}
                          type="radio"
                        />
                        <span>
                          <strong>Cùng một người</strong> với hồ sơ đã có (số
                          điện thoại {existing.maskedPhone ?? "chưa có"}) —{" "}
                          {leaderImport
                            ? "bỏ qua dòng này, không tạo hồ sơ mới"
                            : "thêm hồ sơ đã có vào khóa, không tạo hồ sơ mới"}
                        </span>
                      </label>
                    ))}
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        checked={choices[key] === "different"}
                        className="mt-1"
                        name={name}
                        onChange={() => choose(item, "different")}
                        type="radio"
                      />
                      <span>
                        <strong>Hai người khác nhau</strong> —{" "}
                        {leaderImport
                          ? "tạo hồ sơ huynh trưởng mới"
                          : "tạo hồ sơ huynh trưởng mới và thêm vào khóa"}
                      </span>
                    </label>
                  </fieldset>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex justify-end gap-3">
            <Button
              disabled={submitting}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Để sau
            </Button>
            <Button
              disabled={!allDecided}
              loading={submitting}
              onClick={submit}
              type="button"
            >
              Xác nhận và tiếp tục import
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
