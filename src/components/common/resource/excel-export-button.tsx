"use client";

import { FileXls } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { createExcelExportJob, getApiErrorMessage, newIdempotencyKey } from "@/lib/api/client";
import { excelJobsStore } from "@/lib/jobs/excel-jobs-store";

// Endpoint danh sách -> tên file xuất. Chỉ các danh sách có endpoint `/export` ở backend mới có nút xuất.
export const EXCEL_EXPORT_FILES: Record<string, string> = {
  "/dioceses": "giao-phan.xlsx",
  "/deaneries": "giao-hat.xlsx",
  "/parishes": "giao-xu.xlsx",
  "/leaders": "ho-so-huynh-truong.xlsx",
  "/training/courses": "khoa-huan-luyen.xlsx",
  "/training/participations": "dang-ky-tham-du.xlsx",
  "/training/participants": "danh-sach-tham-du.xlsx",
  "/certificates": "chung-nhan.xlsx",
};

// Bỏ phân trang: file xuất luôn chứa toàn bộ kết quả của bộ lọc/tìm kiếm/sắp xếp đang dùng (không lọc thì xuất tất cả).
export function buildExportPath(endpoint: string, queryString: string) {
  const params = new URLSearchParams(queryString);
  params.delete("page");
  params.delete("size");
  const query = params.toString();
  return `${endpoint}/export${query ? `?${query}` : ""}`;
}

// Xuất chạy nền: nút chỉ tạo tác vụ rồi trả quyền điều khiển ngay; tiến độ và nút tải về nằm ở khay tác vụ.
export function ExcelExportButton({ endpoint, queryString }: { endpoint: string; queryString: string }) {
  const [exporting, setExporting] = useState(false);
  // Một khóa idempotency cho mỗi bộ lọc: bấm đúp hoặc thử lại cùng bộ lọc luôn trỏ về cùng một tác vụ, không xuất hai lần.
  const keys = useRef<Map<string, string>>(new Map());
  const fallbackName = EXCEL_EXPORT_FILES[endpoint];
  if (!fallbackName) return null;

  async function exportExcel() {
    setExporting(true);
    const path = buildExportPath(endpoint, queryString);
    let key = keys.current.get(path);
    if (!key) {
      key = newIdempotencyKey();
      keys.current.set(path, key);
    }
    try {
      let job = await createExcelExportJob(path, key);
      // Khóa này đã ứng với một tác vụ đã kết thúc (lần xuất trước): đây là yêu cầu xuất mới nên dùng khóa mới.
      if (job.replayed && ["SUCCEEDED", "FAILED", "CANCELLED"].includes(job.status)) {
        key = newIdempotencyKey();
        keys.current.set(path, key);
        job = await createExcelExportJob(path, key);
      }
      excelJobsStore.getState().track(job);
      toast.info(job.replayed ? "Tác vụ xuất này đã được tạo, xem ở khay tác vụ" : "Đã nhận yêu cầu, đang xuất Excel nền. Bạn có thể tiếp tục làm việc.");
    } catch (error) {
      keys.current.delete(path);
      toast.error(getApiErrorMessage(error), { duration: 10000 });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Tip label="Xuất Excel theo bộ lọc đang chọn (không lọc thì xuất tất cả)">
      <Button disabled={exporting} loading={exporting} onClick={exportExcel} type="button" variant="outline">
        <FileXls size={18} />
        Xuất Excel
      </Button>
    </Tip>
  );
}
