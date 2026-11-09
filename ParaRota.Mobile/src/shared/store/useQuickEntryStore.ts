import { create } from 'zustand';

export type QuickEntryMode = 'manual' | 'scan';

interface QuickEntryState {
  open: boolean;
  mode: QuickEntryMode;
  openModal: (mode?: QuickEntryMode) => void;
  closeModal: () => void;
}

export const useQuickEntryStore = create<QuickEntryState>((set) => ({
  open: false,
  mode: 'manual',
  openModal: (mode = 'manual') => set({ open: true, mode }),
  closeModal: () => set({ open: false }),
}));
