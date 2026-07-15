"use client";

import { create } from "zustand";

export type AuthUser = {
  username: string;
  leaderId?: string | null;
  dioceseId?: string | null;
  deaneryId?: string | null;
  parishId?: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}));
