'use client';

import { useMemo, useEffect, useState } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { ActionActor } from '@/app/actions/entities';
import { supabase } from '@/lib/supabase';

/**
 * Reusable Hook to construct the ActionActor object for Server Actions.
 * Syncs the live JWT access token automatically so Server Actions never fail with expired tokens.
 */
export function useActionActor(): ActionActor | null {
  const session = useERPStore(s => s.session);
  const [liveToken, setLiveToken] = useState<string | undefined>(session?.token);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined') {
      supabase.auth.getSession().then(({ data: { session: currentSupabaseSession } }) => {
        if (isMounted && currentSupabaseSession?.access_token) {
          setLiveToken(currentSupabaseSession.access_token);
          const currentStore = useERPStore.getState().session;
          if (currentStore && currentStore.token !== currentSupabaseSession.access_token) {
            useERPStore.getState().setSession({
              ...currentStore,
              token: currentSupabaseSession.access_token,
            });
          }
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, []);

  return useMemo(() => {
    if (!session?.userEmail) return null;
    return {
      email: session.userEmail,
      role: session.role,
      token: liveToken || session.token,
    };
  }, [session?.userEmail, session?.role, session?.token, liveToken]);
}
