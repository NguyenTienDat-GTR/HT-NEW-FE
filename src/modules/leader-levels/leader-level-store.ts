"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";

export type LeaderLevelItem = {
  levelCode: string;
  levelName: string;
  // Bậc của cấp: số càng lớn cấp càng cao; các cấp cùng số là bằng cấp nhau.
  displayOrder: number;
  isSystem: boolean;
  description?: string | null;
  // Các cấp của bậc ngay trước: điều kiện để đạt cấp này (rỗng với bậc thấp nhất).
  previousCodes?: string[];
  previousNames?: string[];
  // Chỉ có ở danh sách quản lý.
  courseTypeCount?: number | null;
  deletable?: boolean | null;
};

import { LEADER_LEVELS_PATH, LEADER_LEVELS_QUERY_KEY } from "./query-keys";

export { LEADER_LEVELS_QUERY_KEY };

// Danh mục mặc định dùng khi chưa tải được từ BE (khớp dữ liệu seed), để nhãn không bị trống.
const DEFAULT_LEVELS: LeaderLevelItem[] = [
  { levelCode: "NONE", levelName: "Chưa có cấp", displayOrder: 0, isSystem: true },
  { levelCode: "HT_XU", levelName: "Huynh trưởng xứ", displayOrder: 1, isSystem: false },
  { levelCode: "DU_TRUONG", levelName: "Dự trưởng", displayOrder: 2, isSystem: false },
  { levelCode: "HT_I", levelName: "Huynh trưởng cấp I", displayOrder: 3, isSystem: false },
  { levelCode: "HT_II", levelName: "Huynh trưởng cấp II", displayOrder: 4, isSystem: false },
  { levelCode: "HT_III", levelName: "Huynh trưởng cấp III", displayOrder: 5, isSystem: false },
  { levelCode: "HLV_I", levelName: "Huấn luyện viên cấp I", displayOrder: 6, isSystem: false },
  { levelCode: "HLV_II", levelName: "Huấn luyện viên cấp II", displayOrder: 7, isSystem: false },
  { levelCode: "HLV_III", levelName: "Huấn luyện viên cấp III", displayOrder: 8, isSystem: false },
];

let snapshot: LeaderLevelItem[] = DEFAULT_LEVELS;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLeaderLevels(levels: LeaderLevelItem[]) {
  if (levels.length === 0) return;
  snapshot = [...levels].sort((left, right) => left.displayOrder - right.displayOrder);
  listeners.forEach((listener) => listener());
}

// Đọc đồng bộ danh mục hiện tại (dùng ở nơi không dùng được hook, ví dụ hàm định dạng nhãn).
export function getLeaderLevels() {
  return snapshot;
}

export function leaderLevelName(code: string | null | undefined) {
  if (!code) return "";
  return snapshot.find((level) => level.levelCode === code)?.levelName ?? code;
}

export function leaderLevelRank(code: string | null | undefined) {
  const level = code ? snapshot.find((item) => item.levelCode === code) : undefined;
  return level ? level.displayOrder : -1;
}

// Danh mục cấp độ cho component: tự cập nhật khi danh mục thay đổi.
export function useLeaderLevelList() {
  return useSyncExternalStore(subscribe, getLeaderLevels, getLeaderLevels);
}

// Tải danh mục cấp độ một lần cho cả ứng dụng và đồng bộ vào store (gắn ở AppProviders).
export function useSyncLeaderLevels() {
  const user = useAuthStore((state) => state.user);
  const query = useQuery({
    queryKey: LEADER_LEVELS_QUERY_KEY,
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: () => apiFetch<LeaderLevelItem[]>(LEADER_LEVELS_PATH),
  });
  // Dữ liệu có thể đến từ server (hydrate) mà không qua queryFn, nên đồng bộ vào store theo dữ liệu.
  useEffect(() => {
    if (query.data) setLeaderLevels(query.data);
  }, [query.data]);
}
