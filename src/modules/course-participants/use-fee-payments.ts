"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/client";
import { participantKeys, setFeePaid } from "./api";
import { FeePaymentQueue } from "./fee-payment-queue";

// Hàng đợi tự lưu đóng lệ phí gắn với React Query: thành công không báo gì, lưu hỏng thì trả ô về như cũ và báo lỗi tiếng Việt kèm tên người.
// Khi hàng đợi rỗng một lúc, chỉ làm mới dữ liệu tab Thẻ & điểm danh của các khóa vừa thay đổi (một lần cho cả loạt),
// không làm mới toàn hệ thống.
// keepOptimistic: nơi dùng giữ kết quả tra cứu riêng (màn quét giữ người vừa quét) không được tải lại cùng danh sách, nên không
// được dọn trạng thái vừa lưu khi rảnh, nếu không ô sẽ quay về trạng thái cũ của kết quả tra cứu. Bảng danh sách thì tải lại nên dọn.
export function useFeePayments({ keepOptimistic = false }: { keepOptimistic?: boolean } = {}) {
  const queryClient = useQueryClient();

  const [queue] = useState(() => {
    const created: FeePaymentQueue = new FeePaymentQueue({
      save: async (id, paid, context) => {
        const result = await setFeePaid(context, id, paid);
        return { paid: result.feePaid, paidAt: result.feePaidAt ?? null };
      },
      onError: ({ label, error }) => {
        toast.error(`Không lưu được lệ phí của ${label}: ${getApiErrorMessage(error)}`, { duration: 8000 });
      },
      onIdle: (contexts) => {
        const startedAt = Date.now();
        void Promise.all(contexts.map((code) => queryClient.invalidateQueries({ queryKey: participantKeys.all(code) }))).then(() => {
          if (!keepOptimistic) created.release(startedAt);
        });
      },
    });
    return created;
  });

  // Đổi trạng thái hàng đợi thì vẽ lại.
  useSyncExternalStore(queue.subscribe, queue.getVersion, queue.getVersion);

  // Còn thay đổi chưa lưu xong mà người dùng đóng / tải lại trang thì cảnh báo.
  const hasUnsaved = queue.unsettled > 0;
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  return queue;
}
