'use client';

import { useMemo, useEffect, useState } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { ActionActor } from '@/app/actions/entities';
import { supabase } from '@/lib/supabase';

/**
 * Reusable Hook to construct the ActionActor object for Server Actions.
 * Syncs the live JWT access token automatically so Server Actions never fail with expired tokens.
 * - Initializes liveToken from Supabase session on first render (not deferred)
 * - Retries token refresh if initial session is missing
 */
export function useActionActor(): ActionActor | null {
  const session = useERPStore(s => s.session);
  // Initialize with store token; will be overwritten by live Supabase session ASAP
  const [liveToken, setLiveToken] = useState<string | undefined>(session?.token);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function syncToken() {
      if (typeof window === 'undefined') return;
      try {
        const { data: { session: currentSupabaseSession } } = await supabase.auth.getSession();
        if (isMounted) {
          if (currentSupabaseSession?.access_token) {
            setLiveToken(currentSupabaseSession.access_token);
            // Sync token back to store so other hooks get it too
            const currentStore = useERPStore.getState().session;
            if (currentStore && currentStore.token !== currentSupabaseSession.access_token) {
              useERPStore.getState().setSession({
                ...currentStore,
                token: currentSupabaseSession.access_token,
              });
            }
          } else {
            // Try refreshing session once
            try {
              const { data: refreshData } = await supabase.auth.refreshSession();
              if (isMounted && refreshData?.session?.access_token) {
                setLiveToken(refreshData.session.access_token);
                const currentStore = useERPStore.getState().session;
                if (currentStore) {
                  useERPStore.getState().setSession({
                    ...currentStore,
                    token: refreshData.session.access_token,
                  });
                }
              }
            } catch {}
          }
          setTokenReady(true);
        }
      } catch {
        if (isMounted) setTokenReady(true);
      }
    }

    syncToken();
    return () => { isMounted = false; };
  }, []);

  return useMemo(() => {
    if (!session?.userEmail) return null;
    const token = liveToken || session.token;
    return {
      email: session.userEmail,
      role: session.role,
      token,
    };
  }, [session?.userEmail, session?.role, session?.token, liveToken, tokenReady]);
}
