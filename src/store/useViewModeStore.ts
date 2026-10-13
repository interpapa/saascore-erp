import { create } from 'zustand';

export type ViewMode = 'express' | 'pro';

interface ViewModeState {
  viewMode: ViewMode;
  isMobile: boolean;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  syncWithViewport: () => void;
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

// Determinación estricta de dispositivo por resolución (Móvil < 1024px vs PC >= 1024px)
const getInitialViewMode = (): { viewMode: ViewMode; isMobile: boolean } => {
  if (typeof window !== 'undefined') {
    const isMobile = window.innerWidth < 1024;
    return {
      viewMode: isMobile ? 'express' : 'pro',
      isMobile,
    };
  }
  return { viewMode: 'pro', isMobile: false };
};

export const useViewModeStore = create<ViewModeState>((set, get) => {
  const initial = getInitialViewMode();

  // Escuchar redimensionamiento de pantalla automáticamente en el cliente
  if (typeof window !== 'undefined') {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastIsMobile = window.innerWidth < 1024;
    window.addEventListener('resize', () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const currentIsMobile = window.innerWidth < 1024;
        if (currentIsMobile !== lastIsMobile) {
          lastIsMobile = currentIsMobile;
          set({ isMobile: currentIsMobile, viewMode: currentIsMobile ? 'express' : 'pro' });
        }
      }, 100);
    });
  }

  return {
    viewMode: initial.viewMode,
    isMobile: initial.isMobile,
    hasHydrated: true,
    setViewMode: (viewMode) => set({ viewMode, isMobile: typeof window !== 'undefined' ? window.innerWidth < 1024 : false }),
    toggleViewMode: () => set({ 
      viewMode: get().viewMode === 'express' ? 'pro' : 'express',
      isMobile: typeof window !== 'undefined' ? window.innerWidth < 1024 : false
    }),
    syncWithViewport: () => {
      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 1024;
        set({ viewMode: isMobile ? 'express' : 'pro', isMobile });
      }
    },
    setHasHydrated: (hasHydrated) => set({ hasHydrated }),
  };
});
