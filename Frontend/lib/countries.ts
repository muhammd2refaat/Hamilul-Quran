/**
 * Loads the country list from the static /public/countries.json asset and
 * normalizes it into a single shape the signup form can rely on.
 *
 * The JSON file's exact key names aren't dictated by this app (it's a
 * generic dataset dropped into public/ — currently the dr5hn/
 * countries-states-cities-database export), so this accepts several common
 * aliases seen in popular "countries.json" datasets (name/name_en,
 * name_ar/translations.ar, dial_code/phone_code/calling_code,
 * code/iso2/alpha2/cca2) and normalizes whatever's present. The flag is
 * always computed from the ISO alpha-2 code via Unicode regional-indicator
 * symbols rather than trusting a possibly-missing `flag`/`emoji` field, so a
 * flag renders correctly regardless of what the source file provides.
 *
 * The current dataset doesn't ship an Arabic translation at all (its
 * `translations` object covers other languages but not `ar`), so when a row
 * has none, ARABIC_NAMES_BY_ISO2 supplies one by ISO code instead of
 * silently falling back to the English name in Arabic mode.
 */
import { ARABIC_NAMES_BY_ISO2 } from './countryArabicNames';

export interface CountryOption {
  /** ISO 3166-1 alpha-2 code, upper-cased (e.g. "EG"). */
  code: string;
  /** English display name. */
  name: string;
  /** Arabic display name — falls back to `name` when the source has none. */
  nameAr: string;
  /** E.164 calling code including the leading "+" (e.g. "+20"). */
  dialCode: string;
  /** Emoji flag, e.g. 🇪🇬 — computed from `code`. */
  flag: string;
}

function flagEmoji(iso2: string): string {
  if (!/^[A-Za-z]{2}$/.test(iso2)) return '🏳️';
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Some datasets encode a territory's dial code as "+1-684" (country code
// plus a NANP-style area code) or "+1-809 and 1-829" (multiple area
// codes) rather than a plain "+93". We only want the leading calling
// code as the phone field's prefix — the rest is part of the national
// number the student types themselves.
function normalizeDialCode(raw: unknown): string {
  const str = String(raw ?? '').trim();
  const match = str.match(/\+?(\d+)/);
  return match ? `+${match[1]}` : '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(row: any, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRow(row: any): CountryOption | null {
  const code = String(pick(row, ['code', 'iso2', 'alpha2', 'cca2', 'country_code']) ?? '').toUpperCase();
  const name = String(pick(row, ['name', 'name_en', 'nameEn', 'en']) ?? '').trim();
  if (!code || !name) return null;
  const nameArRaw = pick(row, ['name_ar', 'nameAr', 'ar']) ?? row?.translations?.ar ?? row?.translations?.['ar-SA'];
  const dialCode = normalizeDialCode(pick(row, ['dial_code', 'dialCode', 'phone_code', 'phoneCode', 'calling_code']));
  return {
    code,
    name,
    nameAr: (nameArRaw ? String(nameArRaw).trim() : '') || ARABIC_NAMES_BY_ISO2[code] || name,
    dialCode,
    flag: flagEmoji(code),
  };
}

let cache: Promise<CountryOption[]> | null = null;

/** Fetches and normalizes /countries.json once per page load, then caches it. */
export function loadCountries(): Promise<CountryOption[]> {
  if (!cache) {
    cache = fetch('/countries.json')
      .then((res) => {
        if (!res.ok) throw new Error(`countries.json: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const rows: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.countries) ? data.countries : [];
        return rows
          .map(normalizeRow)
          .filter((c): c is CountryOption => c !== null)
          .sort((a, b) => a.name.localeCompare(b.name));
      })
      .catch((err) => {
        cache = null; // allow a retry on next call instead of caching the failure forever
        throw err;
      });
  }
  return cache;
}
