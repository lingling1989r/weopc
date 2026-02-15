'use client';

import { useCallback } from 'react';
import { useAuthStore } from '../store/auth';

export function useProtectedAction() {
  const { isAuthenticated, setLoginRequired } = useAuthStore();

  const executeProtected = useCallback(
    (action: () => void | Promise<void>, returnUrl?: string) => {
      if (isAuthenticated()) {
        return action();
      } else {
        setLoginRequired(true, returnUrl || window.location.pathname);
      }
    },
    [isAuthenticated, setLoginRequired]
  );

  return { executeProtected };
}
