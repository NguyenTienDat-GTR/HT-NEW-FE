"use client";

import type { ImportErrorRow } from "@/lib/jobs/excel-jobs-client";

// Bảng lỗi khi import Excel bị từ chối: sheet, dòng (theo Excel), cột và nội dung lỗi.
export function ImportErrorsTable({ errors }: { errors: ImportErrorRow[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-surface-2 text-text-secondary">
          <tr>
            <th className="px-3 py-2 font-semibold">Sheet</th>
            <th className="px-3 py-2 font-semibold">Dòng</th>
            <th className="px-3 py-2 font-semibold">Cột</th>
            <th className="px-3 py-2 font-semibold">Lỗi</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((item, index) => (
            <tr className="border-t border-border align-top" key={`${item.sheet}-${item.row}-${item.column}-${index}`}>
              <td className="px-3 py-1.5">{item.sheet}</td>
              <td className="px-3 py-1.5">{item.row > 0 ? item.row : ""}</td>
              <td className="px-3 py-1.5">{item.column}</td>
              <td className="px-3 py-1.5 text-danger">{item.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
