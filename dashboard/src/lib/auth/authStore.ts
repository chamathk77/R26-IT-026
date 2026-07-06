'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUTH_STORAGE_KEY } from './constants';
import { clearAuthCookie, setAuthCookie } from './cookies';
import type { DashboardUser } from './types';

interface AuthState {
  token: string | null;
  user: DashboardUser | null;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  setAuth: (token: string, user: DashboardUser, expiresInSeconds: number) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setAuth: (token, user, expiresInSeconds) => {
        setAuthCookie(token, expiresInSeconds);
        set({ token, user });
      },
      clearAuth: () => {
        clearAuthCookie();
        set({ token: null, user: null });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
