import { z } from "zod";

const serverEnvSchema = z.object({
  BACKEND_ORIGIN: z.url().default("http://localhost:1007"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_WS_URL: z.url().default("ws://localhost:1007/ws/notifications"),
});

export const serverEnv = serverEnvSchema.parse({
  BACKEND_ORIGIN: process.env.BACKEND_ORIGIN,
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
});
