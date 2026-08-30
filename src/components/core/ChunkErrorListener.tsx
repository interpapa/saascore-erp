'use client';

import { useEffect } from 'react';

/**
 * ChunkErrorListener
 * Listens for global unhandled Promise rejections and ChunkLoadErrors 
 * caused by Vercel deployment chunk mismatches during route transitions.
 * Automatically recovers by fetching the latest bundle without showing "Reload page".
 */
export function ChunkErrorListener() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const attemptedChunks = new Map<string, number>();

  const handleChunkError = (reasonStr: string) => {
    const isChunkError =
      reasonStr.includes('Loading chunk') ||
      reasonStr.includes('ChunkLoadError') ||
      reasonStr.includes('Failed to fetch dynamically imported module') ||
      reasonStr.includes('Failed to fetch') ||
      reasonStr.includes('Script error');

    if (isChunkError) {
      // Try to extract chunk identifier from the error message
      const match = reasonStr.match(/Loading chunk (\\S+) failed/);
      const chunkId = match?.[1];

      const attemptCount = (attemptedChunks.get(chunkId ?? '') ?? 0) + 1;
      attemptedChunks.set(chunkId ?? '', attemptCount);

      // Log detailed error information
      console.error('[ChunkError] ', {
        chunkId,
        attemptCount,
        reason: reasonStr,
        timestamp: new Date().toISOString(),
      });

      if (chunkId && attemptCount === 1) {
        // First attempt: try dynamic re‑import
        import(/* webpackChunkName: "[request]" */ `../${chunkId}`).catch(() => {
          const lastReload = sessionStorage.getItem('last_chunk_reload');
          const now = Date.now();
          if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
            sessionStorage.setItem('last_chunk_reload', String(now));
            window.location.reload();
          }
        });
        return;
      }

      // Subsequent attempts or unknown chunk: fallback reload (throttled)
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('last_chunk_reload', String(now));
        window.location.reload();
      }
    }
  };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason?.message || String(e.reason || '');
      handleChunkError(reason);
    };

    const onError = (e: ErrorEvent) => {
      const msg = e.message || '';
      handleChunkError(msg);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return null;
}
