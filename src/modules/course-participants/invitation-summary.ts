import type { InvitationIssue, InvitationResult } from "./types";

export type IssueCategory = "NO_EMAIL" | "BAD_EMAIL" | "NOT_PARTICIPANT" | "SEND_FAILED" | "OTHER";

export const ISSUE_LABELS: Record<IssueCategory, string> = {
  NO_EMAIL: "Chưa có email",
  BAD_EMAIL: "Email sai định dạng",
  NOT_PARTICIPANT: "Không còn trong danh sách tham dự",
  SEND_FAILED: "Máy chủ mail từ chối / lỗi gửi",
  OTHER: "Lỗi khác",
};

// Phân loại lý do BE trả về để nhóm các hồ sơ lỗi cho người dùng dễ xử lý.
export function categorizeIssue(reason: string | null | undefined): IssueCategory {
  const text = (reason ?? "").trim();
  if (text.startsWith("Hồ sơ chưa có email")) return "NO_EMAIL";
  if (text.startsWith("Email không hợp lệ")) return "BAD_EMAIL";
  if (text.startsWith("Hồ sơ không thuộc danh sách tham dự")) return "NOT_PARTICIPANT";
  if (text.startsWith("Không gửi được email") || text.startsWith("Không soạn được email")) return "SEND_FAILED";
  return "OTHER";
}

export type IssueGroup = { category: IssueCategory; label: string; issues: InvitationIssue[] };

const CATEGORY_ORDER: IssueCategory[] = ["NO_EMAIL", "BAD_EMAIL", "SEND_FAILED", "NOT_PARTICIPANT", "OTHER"];

export function groupIssues(issues: InvitationIssue[]): IssueGroup[] {
  const groups = new Map<IssueCategory, InvitationIssue[]>();
  for (const issue of issues) {
    const category = categorizeIssue(issue.reason);
    groups.set(category, [...(groups.get(category) ?? []), issue]);
  }
  return CATEGORY_ORDER.filter((category) => groups.has(category)).map((category) => ({
    category,
    label: ISSUE_LABELS[category],
    issues: groups.get(category) ?? [],
  }));
}

export type InvitationSummary = {
  tone: "success" | "warning" | "danger";
  headline: string;
  details: string[];
};

// Câu tóm tắt kết quả gửi: nêu rõ số đã gửi, số bỏ qua (đã gửi trước đó) và số hồ sơ cần xử lý.
export function summarizeInvitation(result: InvitationResult): InvitationSummary {
  const details: string[] = [];
  if (result.skippedAlreadySent > 0) {
    details.push(`${result.skippedAlreadySent} hồ sơ đã được gửi trước đó nên bỏ qua`);
  }
  for (const group of groupIssues(result.issues)) {
    details.push(`${group.issues.length} hồ sơ: ${group.label.toLowerCase()}`);
  }
  if (result.total === 0 || (result.sent === 0 && result.failed === 0 && result.skippedAlreadySent === 0)) {
    return { tone: "warning", headline: "Không có hồ sơ nào cần gửi", details };
  }
  if (result.failed === 0) {
    return {
      tone: "success",
      headline: result.sent > 0 ? `Đã gửi ${result.sent} email thông tin tham dự` : "Tất cả hồ sơ đã được gửi trước đó, không gửi thêm",
      details,
    };
  }
  if (result.sent === 0) {
    return { tone: "danger", headline: `Không gửi được email nào (${result.failed} hồ sơ lỗi)`, details };
  }
  return { tone: "warning", headline: `Đã gửi ${result.sent} email, ${result.failed} hồ sơ chưa gửi được`, details };
}

// Nội dung tệp CSV (UTF-8 có BOM) liệt kê hồ sơ lỗi để người dùng bổ sung email rồi gửi lại.
export function issuesToCsv(issues: InvitationIssue[]): string {
  const escape = (value: string | null | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const lines = [["Tên thánh", "Họ và tên", "Email", "Lý do"].map(escape).join(",")];
  for (const issue of issues) {
    lines.push([issue.holyName, issue.fullName, issue.email, issue.reason].map(escape).join(","));
  }
  return `﻿${lines.join("\r\n")}`;
}
