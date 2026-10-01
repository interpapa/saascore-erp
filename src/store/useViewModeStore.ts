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
    window.addEventListener('resize', () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const isMobile = window.innerWidth < 1024;
        const newMode: ViewMode = isMobile ? 'express' : 'pro';
        if (get().viewMode !== newMode) {
          set({ viewMode: newMode, isMobile });
        }
      }, 100);
    });
  }

  return {
    viewMode: initial.viewMode,
    isMobile: initial.isMobile,
    hasHydrated: true,
    setViewMode: (viewMode) => set({ viewMode, isMobile: viewMode === 'express' }),
    toggleViewMode: () => set({ 
      viewMode: get().viewMode === 'express' ? 'pro' : 'express',
      isMobile: get().viewMode !== 'express'
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
