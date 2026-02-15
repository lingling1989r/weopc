import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: 'USER' | 'PROVIDER' | 'ADMIN';
  avatar: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loginRequired: boolean;
  returnUrl: string | null;

  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  setLoginRequired: (required: boolean, returnUrl?: string) => void;
  clearLoginRequired: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loginRequired: false,
      returnUrl: null,

      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, loginRequired: false, returnUrl: null });
      },

      clearAuth: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      isAuthenticated: () => !!get().token,

      setLoginRequired: (required, returnUrl) => {
        set({ loginRequired: required, returnUrl: returnUrl || null });
      },

      clearLoginRequired: () => {
        set({ loginRequired: false, returnUrl: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
