import { create } from 'zustand';

// Sidebar durumu MainLayout'un local state'iydi; tanıtım turu motoru sidebar'ı
// programatik açabilsin (collapsed → expand, mobilde drawer) diye store'a taşındı.
// Davranış birebir: collapsed localStorage'da kalıcı, mobileOpen geçici.

const COLLAPSED_KEY = 'pararota:sidebar:collapsed';

interface LayoutState {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  collapsed: readCollapsed(),
  mobileOpen: false,
  toggleCollapsed: () => {
    const next = !get().collapsed;
    writeCollapsed(next);
    set({ collapsed: next });
  },
  setCollapsed: (v) => {
    writeCollapsed(v);
    set({ collapsed: v });
  },
  setMobileOpen: (v) => set({ mobileOpen: v }),
}));
