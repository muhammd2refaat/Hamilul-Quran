'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { EE } from '@/lib/dashboard/theme';
import { loadCountries, type CountryOption } from '@/lib/countries';

interface CountrySelectProps {
  value: CountryOption | null;
  onChange: (country: CountryOption) => void;
  lang: 'en' | 'ar';
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Searchable country combobox — flag + localized name in the closed control
 * and in each dropdown row. Backed by /public/countries.json (see
 * lib/countries.ts). Selecting a country is also how the phone field's
 * dial-code prefix gets set (see the parent form) — this component itself
 * only deals with country selection.
 */
export function CountrySelect({
  value,
  onChange,
  lang,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  id,
}: CountrySelectProps) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadCountries()
      .then((list) => {
        if (!cancelled) setCountries(list);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.nameAr.includes(q) || c.code.toLowerCase() === q
    );
  }, [countries, query]);

  const label = lang === 'ar' ? value?.nameAr : value?.name;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '12px 14px',
          border: `1px solid ${EE.border}`,
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'inherit',
          background: '#fff',
          color: value ? EE.ink : EE.sageFaint,
          cursor: disabled ? 'default' : 'pointer',
          textAlign: 'start' as const,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {value && <span style={{ fontSize: 17, lineHeight: 1 }}>{value.flag}</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label || placeholder}
          </span>
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, color: EE.sageFaint }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 30,
            background: '#fff',
            border: `1px solid ${EE.border}`,
            borderRadius: 10,
            boxShadow: '0 14px 34px rgba(8,30,22,.18)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: `1px solid ${EE.border}` }}>
            <Search size={14} style={{ color: EE.sageFaint, flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', color: EE.ink, background: 'transparent' }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {loadError ? (
              <div style={{ padding: '14px 12px', fontSize: 13, color: EE.sageFaint }}>{emptyLabel}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '14px 12px', fontSize: 13, color: EE.sageFaint }}>{emptyLabel}</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    border: 'none',
                    background: value?.code === c.code ? 'rgba(15,122,61,.08)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    color: EE.ink,
                    textAlign: 'start' as const,
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lang === 'ar' ? c.nameAr : c.name}
                  </span>
                  <span style={{ fontSize: 12, color: EE.sageFaint, flexShrink: 0 }}>{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
