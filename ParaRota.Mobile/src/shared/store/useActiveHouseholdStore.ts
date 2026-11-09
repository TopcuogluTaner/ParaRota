import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ActiveHouseholdState {
  activeId: number | null;
  setActive: (id: number | null) => void;
}

export const useActiveHouseholdStore = create<ActiveHouseholdState>()(
  persist(
    (set) => ({
      activeId: null,
      setActive: (activeId) => set({ activeId }),
    }),
    {
      name: 'pararota.activeHousehold',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
