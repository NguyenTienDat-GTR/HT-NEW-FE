"use client";

import { FilePdf } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiDownload, getApiErrorMessage, parseContentDispositionFilename } from "@/lib/api/client";

// Xuất PDF xem trước của bố cục đang soạn (kể cả chưa lưu) với dữ liệu mẫu. PDF do backend dựng bằng đúng bộ vẽ khi xuất thật
// nên phông, cỡ chữ và vị trí khớp bản in.
export function PreviewPdfButton({
  path,
  buildBody,
  fallbackName,
  disabled,
}: {
  path: string;
  buildBody: () => unknown;
  fallbackName: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const response = await apiDownload(path, { method: "POST", body: JSON.stringify(buildBody()) });
      const blob = await response.blob();
      const filename = parseContentDispositionFilename(response.headers.get("content-disposition")) ?? fallbackName;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất PDF xem trước");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      aria-label="Xuất PDF xem trước"
      disabled={disabled || loading}
      loading={loading}
      onClick={run}
      size="sm"
      title="Xuất PDF xem trước bố cục đang soạn với dữ liệu mẫu"
      type="button"
      variant="outline"
    >
      <FilePdf size={16} /> Xuất PDF
    </Button>
  );
}
