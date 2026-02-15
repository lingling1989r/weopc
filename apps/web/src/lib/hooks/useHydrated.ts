'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if component has been hydrated on client
 * Prevents hydration mismatch by ensuring consistent rendering
 */
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
