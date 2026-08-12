'use client';

import { useERPStore } from '@/store/useERPStore';
import { ActionActor } from '@/app/actions/entities';

/**
 * Reusable Hook to construct the ActionActor object for Server Actions.
 * Encapsulates fallback handling and guarantees consistent email/role attribution.
 */
export function useActionActor(): ActionActor {
  const { session } = useERPStore();

  return {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || 'owner',
  };
}
