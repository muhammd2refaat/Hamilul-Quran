'use client';

import { useEffect, useState } from 'react';
import { Receipt as ReceiptIcon, UploadCloud, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import type { Receipt } from '@/types/dashboard';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: EE.radiusSm,
  border: `1px solid ${EE.border}`,
  fontSize: 14,
  fontFamily: 'inherit',
  color: EE.ink,
  background: '#fff',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: EE.sageMuted,
  marginBottom: 6,
  display: 'block',
};

export default function StudentReceiptsPage() {
  const { t, lang } = useLang();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);

  const loadReceipts = () => {
    apiClient
      .get<Receipt[]>('/receipts/me')
      .then(({ data }) => setReceipts(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setJustUploaded(false);

    const form = new FormData();
    form.set('file', file);
    if (amount.trim()) form.set('amount', amount.trim());
    if (note.trim()) form.set('note', note.trim());

    try {
      // apiClient defaults to Content-Type: application/json, which makes
      // axios JSON.stringify the FormData instead of sending it as a file
      // unless overridden. But a literal 'multipart/form-data' string (no
      // boundary) isn't auto-corrected by the browser either — it becomes
      // an "author header" that blocks the browser's own boundary, and the
      // backend then rejects it with "Missing boundary in multipart". The
      // only override that works is explicit `undefined`: axios's header
      // merge deletes it entirely, so the browser sets the correct
      // multipart Content-Type (with boundary) itself.
      await apiClient.post('/receipts', form, {
        headers: { 'Content-Type': undefined },
      });
      setFile(null);
      setAmount('');
      setNote('');
      setJustUploaded(true);
      loadReceipts();
    } catch {
      setError(t.receiptUploadFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <SectionHeader title={t.receiptsTitle} desc={t.receiptsDesc} />

      <form
        onSubmit={onUpload}
        style={{
          background: '#fff',
          border: `1px solid ${EE.border}`,
          borderRadius: EE.radiusLg,
          padding: 24,
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxWidth: 480,
        }}
      >
        <div>
          <label style={labelStyle}>{t.chooseFile}</label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>{t.receiptAmountLabel}</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{t.receiptNoteLabel}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {error && <p style={{ fontSize: 13, color: '#B91C1C' }}>{error}</p>}
        {justUploaded && (
          <p style={{ fontSize: 13, color: EE.emerald, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} /> {t.receiptUploaded}
          </p>
        )}

        <button
          type="submit"
          disabled={!file || uploading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: EE.emerald,
            color: EE.parchment,
            border: 'none',
            padding: '12px 22px',
            borderRadius: 9,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: !file || uploading ? 'not-allowed' : 'pointer',
            opacity: !file || uploading ? 0.6 : 1,
          }}
        >
          <UploadCloud size={15} />
          {uploading ? t.uploading : t.uploadReceipt}
        </button>
      </form>

      {loading ? (
        <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>
      ) : receipts.length === 0 ? (
        <EmptyState icon={ReceiptIcon} text={t.noReceipts} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {receipts.map((r) => (
            <div
              key={r.id}
              style={{
                background: '#fff',
                border: `1px solid ${EE.border}`,
                borderRadius: EE.radiusMd,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ReceiptIcon size={18} color={EE.goldDeep} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: EE.ink }}>
                    {r.amount || r.original_filename}
                  </div>
                  <div style={{ fontSize: 12, color: EE.sageMuted }}>
                    {new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US')}
                    {r.note ? ` · ${r.note}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: EE.sageFaint }}>
                {t.receiptExpiresLabel}: {new Date(r.expires_at).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
