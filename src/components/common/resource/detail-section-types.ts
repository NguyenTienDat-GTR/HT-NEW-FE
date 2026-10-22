import type { ReactNode } from "react";

export type DetailField = {
  key: string;
  label: string;
  wide?: boolean;
  value?: (row: Record<string, unknown>) => unknown;
  // Hiển thị tùy biến (bỏ qua ResourceCell) và điều kiện hiển thị của riêng trường.
  render?: (row: Record<string, unknown>) => ReactNode;
  visible?: (row: Record<string, unknown>, embedded: boolean) => boolean;
};

export type DetailSection = { title: string; fields: DetailField[]; visible?: (row: Record<string, unknown>) => boolean };

export const hasText = (value: unknown) => typeof value === "string" && value.trim() !== "";
export const hasNumber = (value: unknown) => typeof value === "number";

export const AUDIT_SECTION: DetailSection = {
  title: "Lịch sử ghi nhận",
  fields: [
    { key: "createdByName", label: "Người tạo" },
    { key: "createdAt", label: "Ngày tạo" },
    { key: "updatedByName", label: "Người cập nhật" },
    { key: "updatedAt", label: "Ngày cập nhật" },
  ],
};
