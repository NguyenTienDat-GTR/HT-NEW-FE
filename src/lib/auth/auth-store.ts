"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";

export type AuthUser = {
  username: string;
  leaderId?: string | null;
  dioceseId?: string | null;
  deaneryId?: string | null;
  parishId?: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
  unitLocked?: boolean;
};

/**
 * Test/production: BE không trả accessToken trong body, token chỉ nằm trong cookie HttpOnly.
 * Giá trị này đánh dấu "đã có phiên" trong store; không phải token và không bao giờ được gửi đi.
 */
export const COOKIE_SESSION = "__cookie_session__";

/** Token thật để đặt vào header Bearer, hoặc null khi phiên chỉ dựa vào cookie HttpOnly. */
export function bearerTokenOf(token: string | null | undefined): string | null {
  return token && token !== COOKIE_SESSION ? token : null;
}

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
};

const authStore = createStore<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}));

// Người dùng do server đọc từ cookie phiên khi render HTML (mỗi request một giá trị).
// Store ở trên là biến toàn cục của module nên KHÔNG được ghi dữ liệu người dùng vào đó trên server;
// khi render ở server và khi hydrate, hook đọc người dùng từ context này để HTML khớp nhau.
export const ServerAuthContext = createContext<AuthUser | null>(null);

export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  const serverUser = useContext(ServerAuthContext);
  const serverState = useMemo<AuthState>(() => ({ ...authStore.getInitialState(), user: serverUser }), [serverUser]);
  return useSyncExternalStore(
    authStore.subscribe,
    () => selector(authStore.getState()),
    () => selector(serverState),
  );
}

useAuthStore.getState = authStore.getState;
useAuthStore.setState = authStore.setState;
useAuthStore.subscribe = authStore.subscribe;
