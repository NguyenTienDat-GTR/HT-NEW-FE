import { MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "./client";

/**
 * Lỗi của mutation hiển thị ở một chỗ: mutation nào tự khai báo `onError` (toast riêng, báo lỗi ngay trên form...)
 * thì tự xử lý, các mutation còn lại nhận toast lỗi chung. Nhờ vậy lớp gọi API không phải biết gì về giao diện.
 */
export function createMutationCache() {
  return new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.onError) return;
      toast.error(getApiErrorMessage(error));
    },
  });
}
