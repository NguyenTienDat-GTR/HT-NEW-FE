"use client";

import { Copy } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AvatarWarning } from "@/lib/jobs/excel-jobs-client";

// Hồ sơ không gắn được ảnh khi import (dữ liệu hồ sơ vẫn được lưu): dòng Excel, họ tên, tên file ảnh và lý do.
export function AvatarWarningsList({ warnings }: { warnings: AvatarWarning[] }) {
  if (warnings.length === 0) return null;

  async function copy() {
    const text = warnings.map((item) => `Dòng ${item.row} - ${item.fullName} - ${item.fileName}: ${item.reason}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép danh sách hồ sơ lỗi ảnh");
    } catch {
      toast.error("Không sao chép được, vui lòng chọn và sao chép thủ công");
    }
  }

  return (
    <div className="space-y-2">
      <div className="max-h-64 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface-2 text-text-secondary">
            <tr>
              <th className="px-3 py-2 font-semibold">Dòng</th>
              <th className="px-3 py-2 font-semibold">Họ và tên</th>
              <th className="px-3 py-2 font-semibold">File ảnh</th>
              <th className="px-3 py-2 font-semibold">Lý do</th>
            </tr>
          </thead>
          <tbody>
            {warnings.map((item, index) => (
              <tr className="border-t border-border align-top" key={`${item.row}-${item.fileName}-${index}`}>
                <td className="px-3 py-1.5">{item.row}</td>
                <td className="px-3 py-1.5">{item.fullName}</td>
                <td className="px-3 py-1.5 break-all">{item.fileName}</td>
                <td className="px-3 py-1.5 text-amber-700">{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button onClick={() => void copy()} size="sm" type="button" variant="outline">
        <Copy size={14} />
        Sao chép danh sách
      </Button>
    </div>
  );
}
