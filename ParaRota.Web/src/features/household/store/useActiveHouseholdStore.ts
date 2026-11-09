import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveHouseholdState {
  /** null = kişisel hesap. number = bu household'a switch'lendi. */
  activeId: number | null;
  setActive: (id: number | null) => void;
}

export const useActiveHouseholdStore = create<ActiveHouseholdState>()(
  persist(
    (set) => ({
      activeId: null,
      setActive: (id) => set({ activeId: id }),
    }),
    {
      name: 'pararota-active-household',
      version: 1,
      // Eski/bozuk storage'tan gelirse activeId'yi number-or-null olarak güvenceye al.
      migrate: (persisted) => {
        const raw = (persisted as { activeId?: unknown } | undefined)?.activeId;
        const activeId = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
        return { activeId } as ActiveHouseholdState;
      },
    },
  ),
);
