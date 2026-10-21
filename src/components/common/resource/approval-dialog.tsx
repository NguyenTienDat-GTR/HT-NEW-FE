"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle, XCircle, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLeaderLevels, leaderLevelName, leaderLevelRank } from "@/modules/leader-levels/leader-level-store";

export type ApprovalDialogItem = { id: string; label: string };

// Hồ sơ ngoại lệ cần người duyệt chọn cấp độ đạt được sau khi hoàn thành khóa.
export type ExceptionLevelItem = { id: string; label: string; leaderLevel: string; courseLevel: string };

// Cấp có thể chọn: cao hơn cấp hiện tại của huynh trưởng và không cao hơn cấp độ đạt được của khóa.
export function achievableLevels(item: Pick<ExceptionLevelItem, "leaderLevel" | "courseLevel">) {
  const current = leaderLevelRank(item.leaderLevel);
  const max = leaderLevelRank(item.courseLevel);
  return getLeaderLevels().filter((level) => level.displayOrder > current && level.displayOrder <= max);
}

export type CertificateSigner = { signerType: "CHAPLAIN" | "OTHER"; signerName: string; signerTitle: string };

type ReasonScope = "shared" | "individual";

const inputClass = "w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none";

const textareaClass = "w-full rounded-[8px] border border-border bg-white px-3 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none";

export function ApprovalDialog({
  loading,
  onClose,
  onConfirm,
  open,
  mode = "approve",
  items,
  captureSigner,
  exceptionItems,
}: {
  loading?: boolean;
  onClose: () => void;
  // reasons chỉ có khi từ chối nhiều hồ sơ: lý do của từng hồ sơ (lý do chung được sao chép cho mọi hồ sơ).
  onConfirm: (note: string, reasons?: Record<string, string>, signer?: CertificateSigner, achievedLevels?: Record<string, string>) => void;
  open: boolean;
  mode?: "approve" | "reject";
  // Danh sách hồ sơ đang xử lý hàng loạt; từ 2 hồ sơ trở lên mới cho chọn lý do chung/riêng.
  items?: ApprovalDialogItem[];
  // Khi duyệt chứng nhận: bắt buộc chọn người ký, ghi trực tiếp vào chứng nhận.
  captureSigner?: boolean;
  // Khi duyệt: các hồ sơ ngoại lệ phải chọn cấp độ đạt được (bắt buộc cho từng hồ sơ).
  exceptionItems?: ExceptionLevelItem[];
}) {
  const [note, setNote] = useState("");
  const [scope, setScope] = useState<ReasonScope>("shared");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [signerType, setSignerType] = useState<"CHAPLAIN" | "OTHER">("CHAPLAIN");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [levels, setLevels] = useState<Record<string, string>>({});
  const reject = mode === "reject";
  const levelItems = reject ? [] : (exceptionItems ?? []);
  const missingLevel = levelItems.some((item) => !levels[item.id] || !achievableLevels(item).some((level) => level.levelCode === levels[item.id]));
  const levelsOut = levelItems.length ? Object.fromEntries(levelItems.map((item) => [item.id, levels[item.id]])) : undefined;
  const multi = reject && (items?.length ?? 0) >= 2;
  const individual = multi && scope === "individual";
  const needSigner = Boolean(captureSigner) && !reject;
  const missingSigner = needSigner && (!signerName.trim() || (signerType === "OTHER" && !signerTitle.trim()));
  // Từ chối phải nêu lý do: một lý do chung, hoặc đủ lý do cho từng hồ sơ.
  const missingReason = reject && (individual ? (items ?? []).some((item) => !reasons[item.id]?.trim()) : !note.trim());
  const missingCount = individual ? (items ?? []).filter((item) => !reasons[item.id]?.trim()).length : 0;

  const signer: CertificateSigner | undefined = needSigner
    ? { signerType, signerName: signerName.trim(), signerTitle: signerType === "OTHER" ? signerTitle.trim() : "Linh mục tuyên úy" }
    : undefined;

  function confirm() {
    if (individual && items) {
      onConfirm("", Object.fromEntries(items.map((item) => [item.id, reasons[item.id].trim()])), signer, levelsOut);
      return;
    }
    if (reject && items?.length) {
      onConfirm(note, Object.fromEntries(items.map((item) => [item.id, note.trim()])), signer, levelsOut);
      return;
    }
    onConfirm(note, undefined, signer, levelsOut);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[14px] border border-border bg-white p-5 shadow-2xl focus:outline-none",
            individual ? "max-w-[640px]" : "max-w-[500px]",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${reject ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
                {reject ? <XCircle size={20} weight="bold" /> : <CheckCircle size={20} weight="bold" />}
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  {reject ? (multi ? `Từ chối ${items?.length} hồ sơ` : "Từ chối duyệt hồ sơ") : "Duyệt hồ sơ"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                  {reject ? "Nhập lý do từ chối duyệt." : "Nhập ghi chú hoặc lý do ngoại lệ nếu cần."}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>

          {multi ? (
            <div aria-label="Cách nhập lý do" className="mt-4 grid grid-cols-2 gap-1 rounded-[10px] bg-surface-1 p-1" role="radiogroup">
              {(
                [
                  { value: "shared", label: "Lý do chung" },
                  { value: "individual", label: "Lý do riêng từng hồ sơ" },
                ] as const
              ).map((option) => (
                <button
                  aria-checked={scope === option.value}
                  className={cn(
                    "rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors",
                    scope === option.value ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground",
                  )}
                  key={option.value}
                  onClick={() => setScope(option.value)}
                  role="radio"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          {individual && items ? (
            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <label className="block" key={item.id}>
                  <span className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold text-foreground">
                    <span className="text-xs font-medium text-muted">{index + 1}.</span>
                    {item.label}
                  </span>
                  <textarea
                    className={cn(textareaClass, "min-h-16")}
                    onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Lý do từ chối hồ sơ này (bắt buộc)"
                    value={reasons[item.id] ?? ""}
                  />
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className={cn(textareaClass, "mt-4 min-h-28")}
              onChange={(event) => setNote(event.target.value)}
              placeholder={reject ? (multi ? "Lý do chung cho tất cả hồ sơ (bắt buộc)" : "Lý do từ chối (bắt buộc)") : "Ghi chú duyệt"}
              value={note}
            />
          )}

          {levelItems.length ? (
            <div className="mt-4 min-h-0 space-y-3 overflow-y-auto rounded-[10px] border border-border p-3">
              <div>
                <span className="block text-sm font-semibold text-foreground">
                  Cấp độ đạt được sau khi hoàn thành khóa <span className="text-danger">*</span>
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Hồ sơ ngoại lệ: chọn cấp cao hơn cấp hiện tại và không cao hơn cấp độ đạt được của khóa.
                </span>
              </div>
              {levelItems.map((item) => {
                const choices = achievableLevels(item);
                return (
                  <label className="block" key={item.id}>
                    <span className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-foreground">
                      {item.label}
                      <span className="text-xs font-normal text-muted">
                        hiện là {leaderLevelName(item.leaderLevel)} · khóa cấp tối đa {leaderLevelName(item.courseLevel)}
                      </span>
                    </span>
                    <select
                      className="h-10 w-full rounded-[8px] border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none"
                      disabled={choices.length === 0}
                      onChange={(event) => setLevels((current) => ({ ...current, [item.id]: event.target.value }))}
                      value={levels[item.id] ?? ""}
                    >
                      <option value="">{choices.length ? "— Chọn cấp độ đạt được —" : "Không có cấp hợp lệ để chọn"}</option>
                      {choices.map((level) => (
                        <option key={level.levelCode} value={level.levelCode}>
                          {level.levelName}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          ) : null}

          {needSigner ? (
            <div className="mt-4 space-y-3 rounded-[10px] border border-border p-3">
              <span className="block text-sm font-semibold text-foreground">Người ký chứng nhận <span className="text-danger">*</span></span>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input checked={signerType === "CHAPLAIN"} onChange={() => setSignerType("CHAPLAIN")} type="radio" />
                  Linh mục tuyên úy
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input checked={signerType === "OTHER"} onChange={() => setSignerType("OTHER")} type="radio" />
                  Khác
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={inputClass} onChange={(event) => setSignerName(event.target.value)} placeholder="Tên người ký" value={signerName} />
                {signerType === "OTHER" ? (
                  <input className={inputClass} onChange={(event) => setSignerTitle(event.target.value)} placeholder="Chức danh" value={signerTitle} />
                ) : (
                  <input className={cn(inputClass, "bg-surface-2 text-muted")} disabled value="Linh mục tuyên úy" />
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-3">
            {missingCount > 0 ? <span className="mr-auto text-xs text-danger">Còn {missingCount} hồ sơ chưa nhập lý do</span> : null}
            <Button onClick={onClose} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={missingReason || missingSigner || missingLevel} loading={loading} onClick={confirm} type="button" variant={reject ? "destructive" : "primary"}>
              {reject ? "Từ chối" : "Duyệt"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
