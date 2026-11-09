/**
 * TR locale girdi (virgüllü/noktalı karışık binlik ayraç) → number.
 * "1.234,56" → 1234.56, "1234.56" → 1234.56, "1,5" → 1.5,
 * "1.234" → 1234 (binlik gruplama; formatAmountInput çıktısı). NaN olabilir.
 * (Mobil src/shared/lib/parseAmount.ts ile birebir aynı — davranış paritesi.)
 */
export function parseAmount(input: string): number {
  if (!input) return NaN;
  const s = input.trim();
  const commaIdx = s.indexOf(',');
  if (commaIdx >= 0) {
    // ',' ondalık ayraçtır; noktalar binliktir: "12.345,5" → 12345.5
    const intDigits = s.slice(0, commaIdx).replace(/[^\d-]/g, '');
    const dec = s.slice(commaIdx + 1).replace(/\D/g, '');
    return Number(`${intDigits || '0'}.${dec || '0'}`);
  }
  const parts = s.split('.');
  if (parts.length === 1) return Number(s);
  // Nokta(lar) var, virgül yok: tüm gruplar binlik desene uyuyorsa (ilk grup
  // 1-3 hane, kalanlar tam 3) gruplama say: "1.234" → 1234, "1.234.567" →
  // 1234567. Uymuyorsa son nokta ondalıktır: "1234.56" → 1234.56.
  const isGrouping =
    parts.every((p) => /^\d+$/.test(p.replace(/^-/, ''))) &&
    parts[0].replace(/^-/, '').length >= 1 && parts[0].replace(/^-/, '').length <= 3 &&
    parts.slice(1).every((p) => p.length === 3);
  if (isGrouping) return Number(parts.join(''));
  return Number(parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]);
}

/**
 * Tutar alanı için canlı TR biçimi: tam kısım binlik '.' ile gruplanır,
 * ondalık ',' ile yazılır (en çok 2 hane). "1234567" → "1.234.567",
 * "1234,5" → "1.234,5". parseAmount bu çıktıyı sorunsuz geri çevirir.
 *
 * Kurallar:
 * - Yazarken basılan sondaki '.' (EN klavyenin ondalık tuşu) ','ya çevrilir.
 * - Silme sırasında ('prev' daha uzunsa) noktalar bizim eklediğimiz binlik
 *   ayraçlar sayılır → "1.234" sil → "1.23" yanlışlıkla "1,23" olmaz.
 * - prev verilmeden çağrılırsa (prefill/OCR: "1234.56") tek nokta + ≤2 hane
 *   ondalık kabul edilir → "1.234,56".
 * - İkinci bir ',' yazılırsa yok sayılır (ilk virgül ondalık ayraçtır).
 */
export function formatAmountInput(next: string, prev = ''): string {
  if (!next) return '';
  const deleting = next.length < prev.length;
  let s = next.replace(/[^\d.,]/g, '');
  if (!s) return '';
  if (!deleting && s.endsWith('.')) s = `${s.slice(0, -1)},`;

  let intPart: string;
  let decPart: string | null = null;
  const commaIdx = s.indexOf(',');
  if (commaIdx >= 0) {
    intPart = s.slice(0, commaIdx);
    decPart = s.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2);
  } else {
    const dotIdx = s.lastIndexOf('.');
    const after = dotIdx >= 0 ? s.slice(dotIdx + 1) : '';
    const singleDot = dotIdx >= 0 && s.indexOf('.') === dotIdx;
    if (!deleting && prev === '' && singleDot && after.length > 0 && after.length <= 2) {
      intPart = s.slice(0, dotIdx);
      decPart = after;
    } else {
      intPart = s;
    }
  }

  const digits = intPart.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart === null ? grouped : `${grouped || '0'},${decPart}`;
}
