import type { Candidate, ItemDraft } from "./types";

export const emptyDraft: ItemDraft = { reason: "", exceptionReason: "", note: "" };

export function candidateName(candidate: Pick<Candidate, "holyName" | "fullName">) {
  return [candidate.holyName, candidate.fullName].filter(Boolean).join(" ");
}

// Huynh trưởng được chọn còn thiếu lí do gửi (mọi hồ sơ) hoặc lí do ngoại lệ (hồ sơ chưa đủ điều kiện).
export function missingReasons(selected: Candidate[], drafts: Record<string, ItemDraft>) {
  return selected.filter((candidate) => {
    const draft = drafts[candidate.leaderId] ?? emptyDraft;
    return !draft.reason.trim() || (!candidate.eligible && !draft.exceptionReason.trim());
  });
}

// Payload gửi lên BE: lí do ngoại lệ chỉ gửi cho hồ sơ chưa đủ điều kiện; ghi chú để trống thì bỏ.
export function buildItems(selected: Candidate[], drafts: Record<string, ItemDraft>) {
  return selected.map((candidate) => {
    const draft = drafts[candidate.leaderId] ?? emptyDraft;
    return {
      leaderId: candidate.leaderId,
      reason: draft.reason.trim(),
      exceptionReason: candidate.eligible ? undefined : draft.exceptionReason.trim(),
      note: draft.note.trim() || undefined,
    };
  });
}
