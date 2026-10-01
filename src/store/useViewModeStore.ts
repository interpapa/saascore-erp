import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ViewMode = 'express' | 'pro';

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set, get) => ({
      // Default to express for ergonomic touch usage; hydration checks window width if first time
      viewMode: 'express',
      hasHydrated: false,
      setViewMode: (viewMode) => set({ viewMode }),
      toggleViewMode: () => set({ viewMode: get().viewMode === 'express' ? 'pro' : 'express' }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'saascore-view-mode',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // If client-side and no prior explicit preference set in storage, adapt to viewport
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('saascore-view-mode');
          if (!stored && window.innerWidth >= 1024) {
            state?.setViewMode('pro');
          }
        }
      },
    }
  )
);
