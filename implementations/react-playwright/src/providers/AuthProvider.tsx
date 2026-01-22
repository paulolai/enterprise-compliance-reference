import React, { useEffect } from 'react';
import { authClient } from '../lib/auth';
import { useCartStore } from '../store/cartStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useCartStore((state) => state.setUser);

  useEffect(() => {
    // Initial sync on mount
    const initialUser = authClient.getState().user || null;
    setUser(initialUser);

    // Subscribe to auth changes
    const unsubscribe = authClient.subscribe(() => {
      const currentUser = authClient.getState().user || null;
      setUser(currentUser);
    });

    return unsubscribe;
  }, [setUser]);

  return <>{children}</>;
}
