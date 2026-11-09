#!/usr/bin/env node
/**
 * i18n parity check — 5 dilin namespace JSON dosyaları arasında key uyumunu doğrular.
 *
 * CLDR plural rules sebebiyle bazı dillerde fazla key olması NORMAL'dir:
 *   - Arapça: zero/one/two/few/many/other (6 form)
 *   - İngilizce/Türkçe/İspanyolca/Almanca: one/other (2 form)
 *
 * Bu yüzden `_zero/_two/_few/_many` suffix'li key'leri canonical form'a indirgeyip
 * (örn. member_count_few → member_count_other) öyle karşılaştırırız. Aksi halde
 * AR'daki doğru plural form'lar yanlışlıkla "drift" olarak raporlanır.
 *
 * Usage:
 *   node scripts/i18n-parity-check.mjs
 *
 * Exit code: 0 (parity OK) | 1 (drift bulundu).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesRoot = resolve(__dirname, '../src/shared/i18n/locales');
const REFERENCE_LANG = 'tr';
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

function flatten(obj, prefix = '') {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flatten(v, key)) out.add(sub);
    } else {
      out.add(key);
    }
  }
  return out;
}

/** Plural suffix'li key'i canonical `_other`'a indirger; pluralsız key olduğu gibi döner. */
function canonical(key) {
  for (const sfx of PLURAL_SUFFIXES) {
    if (key.endsWith(sfx)) return key.slice(0, -sfx.length) + '_other';
  }
  return key;
}

const langs = readdirSync(localesRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (!langs.includes(REFERENCE_LANG)) {
  console.error(`Referans dil "${REFERENCE_LANG}" bulunamadı.`);
  process.exit(2);
}

const namespaces = readdirSync(resolve(localesRoot, REFERENCE_LANG))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

let driftFound = false;

for (const ns of namespaces) {
  const perLang = {};
  for (const L of langs) {
    const path = resolve(localesRoot, L, `${ns}.json`);
    try {
      const json = JSON.parse(readFileSync(path, 'utf8'));
      perLang[L] = new Set([...flatten(json)].map(canonical));
    } catch {
      perLang[L] = new Set();
      driftFound = true;
      console.error(`✗ ${ns}.json eksik: ${L}`);
    }
  }
  const ref = perLang[REFERENCE_LANG];
  const issues = [];
  for (const L of langs) {
    if (L === REFERENCE_LANG) continue;
    const extra = [...perLang[L]].filter((k) => !ref.has(k));
    const missing = [...ref].filter((k) => !perLang[L].has(k));
    if (extra.length || missing.length) {
      issues.push({ L, extra, missing });
    }
  }
  if (issues.length === 0) {
    console.log(`✓ ${ns}.json (${ref.size} canonical key, ${langs.length} dil)`);
  } else {
    driftFound = true;
    console.log(`✗ ${ns}.json DRIFT:`);
    for (const { L, extra, missing } of issues) {
      if (extra.length) console.log(`    ${L} fazla: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ` (+${extra.length - 5} more)` : ''}`);
      if (missing.length) console.log(`    ${L} eksik: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` (+${missing.length - 5} more)` : ''}`);
    }
  }
}

if (driftFound) {
  console.error('\ni18n parity HATALI.');
  process.exit(1);
}
console.log('\ni18n parity OK — 5 dil, CLDR plural rules ile uyumlu.');
