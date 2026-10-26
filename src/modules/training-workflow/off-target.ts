import type { RegistrationEntry } from "@/components/form/resource-form/registration-list-field";

// Hồ sơ gửi ngoài đợt (giáo hạt của huynh trưởng không nằm trong các giáo hạt mà khóa giáo phận dành cho).
export function offTargetEntries(...lists: RegistrationEntry[][]): RegistrationEntry[] {
  return lists.flat().filter((entry) => entry.offTarget === true);
}

export function entryDisplayName(entry: RegistrationEntry) {
  return [entry.holyName, entry.fullName].filter(Boolean).join(" ");
}

// Hồ sơ ngoài đợt còn thiếu lí do riêng.
export function missingOffTargetReasons(entries: RegistrationEntry[]) {
  return offTargetEntries(entries).filter((entry) => !entry.offTargetReason?.trim());
}

// Lí do đã nhập (cắt khoảng trắng) gắn vào đúng hồ sơ ngoài đợt; hồ sơ khác giữ nguyên.
export function applyOffTargetReasons(entries: RegistrationEntry[], reasons: Record<string, string>): RegistrationEntry[] {
  return entries.map((entry) => (entry.offTarget === true ? { ...entry, offTargetReason: (reasons[entry.id] ?? entry.offTargetReason ?? "").trim() } : entry));
}

// Phần bổ sung của payload đăng ký: lí do ngoài đợt (chỉ hồ sơ ngoài đợt) và ghi chú tùy chọn từng hồ sơ.
export function registrationExtras(entries: RegistrationEntry[]) {
  const offTargetReasonsByLeaderId: Record<string, string> = {};
  const notesByLeaderId: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.offTarget === true && entry.offTargetReason?.trim()) offTargetReasonsByLeaderId[entry.id] = entry.offTargetReason.trim();
    if (entry.note?.trim()) notesByLeaderId[entry.id] = entry.note.trim();
  }
  return { offTargetReasonsByLeaderId, notesByLeaderId };
}
