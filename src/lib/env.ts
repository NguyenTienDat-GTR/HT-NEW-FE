import { z } from "zod";

const serverEnvSchema = z.object({
  BACKEND_ORIGIN: z.url().default("http://localhost:1007"),
});

const clientEnvSchema = z.object({
  // Để trống (production) = WebSocket cùng tên miền với trang đang mở, xem resolveWsUrl.
  NEXT_PUBLIC_WS_URL: z.union([z.literal(""), z.url()]).default("ws://localhost:1007/ws/notifications"),
});

export const serverEnv = serverEnvSchema.parse({
  BACKEND_ORIGIN: process.env.BACKEND_ORIGIN,
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
});

// Production phục vụ nhiều tên miền (mỗi giáo phận một subdomain) nên WebSocket phải đi qua đúng tên miền của trang,
// nếu không cookie đăng nhập (gắn theo từng host) không được gửi kèm.
export function resolveWsUrl(): string {
  if (clientEnv.NEXT_PUBLIC_WS_URL) return clientEnv.NEXT_PUBLIC_WS_URL;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/notifications`;
}
