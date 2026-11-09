import { useEffect, useState } from 'react';

// ──────────────────────────────────────────────────────────
// Hedef element ölçümü — [data-tour="<id>"] elementinin viewport rect'ini
// canlı takip eder: resize/scroll dinleyicileri + ResizeObserver + kısa
// aralıklı diff kontrolü (sidebar genişleme animasyonu gibi transform/layout
// kaymalarını da yakalar; ResizeObserver konum değişimini bildirmez).
// ──────────────────────────────────────────────────────────

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function findTourTarget(target: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

/** Element DOM'da var ve görünür boyutta mı? (display:none → 0×0 rect) */
export function isTargetVisible(target: string): boolean {
  const el = findTourTarget(target);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2;
}

function measure(el: HTMLElement): TargetRect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function rectsEqual(a: TargetRect | null, b: TargetRect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export function useTargetRect(target: string | null): TargetRect | null {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    if (!target) return; // hook zaten null döner
    const el = findTourTarget(target);
    if (!el) {
      // Senkron setState yerine bir frame ertele (react-hooks/set-state-in-effect).
      const raf = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(raf);
    }

    // Hedef ekran dışındaysa ortala, sonra ölç.
    const vr = el.getBoundingClientRect();
    const fullyVisible = vr.top >= 0 && vr.bottom <= window.innerHeight;
    if (!fullyVisible) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }

    let last: TargetRect | null = null;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = measure(el);
        if (!rectsEqual(last, next)) {
          last = next;
          setRect(next);
        }
      });
    };

    update();
    window.addEventListener('resize', update);
    // capture: sayfa içi scroll container'ları da yakala
    window.addEventListener('scroll', update, true);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Layout kaymaları (sidebar genişleme, font yüklenmesi) için güvenlik ağı.
    const interval = window.setInterval(update, 300);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      ro.disconnect();
      window.clearInterval(interval);
    };
  }, [target]);

  return target ? rect : null;
}
