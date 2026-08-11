'use client';

import { useEffect } from 'react';

/**
 * Global Keyboard Shortcuts Hook.
 * Listens for system-wide key combinations:
 * - Ctrl + N / Cmd + N: Dispatches 'global:create_action'
 * - Escape: Dispatches 'global:escape_action'
 * - Ctrl + K / Cmd + K: Dispatches 'global:open_command_palette'
 */
export function useKeybindings() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl + N or Cmd + N (Quick Create Action)
      if (modifier && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('global:create_action'));
      }

      // Escape (Close modals/drawers)
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('global:escape_action'));
      }

      // Ctrl + K or Cmd + K (Open Command Palette)
      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('global:open_command_palette'));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
