'use client';

import { useMemo } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { ActionActor } from '@/app/actions/entities';

/**
 * Reusable Hook to construct the ActionActor object for Server Actions.
 * Returns null if no valid session exists — callers must handle this
 * by redirecting to login or showing an auth prompt.
 */
export function useActionActor(): ActionActor | null {
  const session = useERPStore(s => s.session);

  return useMemo(() => {
    if (!session?.userEmail) return null;
    return {
      email: session.userEmail,
      role: session.role,
      token: session.token,
    };
  }, [session?.userEmail, session?.role, session?.token]);
}
