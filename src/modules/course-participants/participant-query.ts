import type { BadgeExportOptions, InvitationFilter, InvitationOptions } from "./types";

export type ParticipantQueryState = {
  page: number;
  size: number;
  search: string;
  team: string;
  checkedIn: "" | "true" | "false";
  invitation: "" | InvitationFilter;
};

export const EMPTY_PARTICIPANT_QUERY: ParticipantQueryState = { page: 0, size: 20, search: "", team: "", checkedIn: "", invitation: "" };

export const PARTICIPANT_PAGE_SIZES = [20, 50, 100];

// Tham số truy vấn danh sách hồ sơ của tab (bỏ qua điều kiện rỗng).
export function buildParticipantParams(state: ParticipantQueryState): string {
  const params = new URLSearchParams({ page: String(Math.max(0, state.page)), size: String(state.size) });
  if (state.search.trim()) params.set("search", state.search.trim());
  if (state.team) params.set("team", state.team);
  if (state.checkedIn) params.set("checkedIn", state.checkedIn);
  if (state.invitation) params.set("invitation", state.invitation);
  return params.toString();
}

export function activeFilterCount(state: ParticipantQueryState): number {
  return [state.team, state.checkedIn, state.invitation].filter(Boolean).length;
}

// Body xuất thẻ: bỏ trường rỗng để BE dùng mặc định (cấu hình chung của khóa, cả danh sách tham dự).
export function badgeExportBody(options: BadgeExportOptions) {
  const body: Record<string, unknown> = { includeBack: options.includeBack, flipEdge: options.flipEdge };
  if (options.configId) body.configId = options.configId;
  if (options.participationIds && options.participationIds.length > 0) body.participationIds = options.participationIds;
  if (options.teamName && options.teamName.trim()) body.teamName = options.teamName.trim();
  return body;
}

export function invitationBody(options: InvitationOptions) {
  const body: Record<string, unknown> = { includeQr: options.includeQr, resend: options.resend };
  if (options.participationIds && options.participationIds.length > 0) body.participationIds = options.participationIds;
  return body;
}

// Tổng thẻ sẽ in theo lựa chọn hiện tại (để hiện trước trong hộp thoại xuất).
export function badgeCountFor(options: { selected: number; total: number; teamCount?: number }): number {
  if (options.selected > 0) return options.selected;
  if (options.teamCount !== undefined) return options.teamCount;
  return options.total;
}
