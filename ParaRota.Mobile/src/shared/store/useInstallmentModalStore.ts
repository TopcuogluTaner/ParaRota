import { create } from 'zustand';

// '+' menüsündeki "Taksitli alışveriş" girişinin global modal'ı (useQuickEntryStore emsali).
// Taksitler ekranındaki düzenleme modal'ı bundan BAĞIMSIZ local state kullanır — drawer
// ekranları mount kaldığından store'u paylaşan iki instance aynı anda açılırdı.
interface InstallmentModalState {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useInstallmentModalStore = create<InstallmentModalState>((set) => ({
  open: false,
  openModal: () => set({ open: true }),
  closeModal: () => set({ open: false }),
}));
