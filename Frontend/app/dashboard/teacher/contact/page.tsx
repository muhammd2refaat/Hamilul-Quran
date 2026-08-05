'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';

export default function TeacherContactPage() {
  const { t } = useLang();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(false);
    try {
      await apiClient.post('/requests', {
        type: 'other',
        details: message,
      });
      setSent(true);
      setMessage('');
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <SectionHeader title={t.contactTitle} desc={t.contactDesc} />

      <div
        style={{
          background: '#fff',
          border: `1px solid ${EE.border}`,
          borderRadius: EE.radiusLg,
          padding: 24,
          maxWidth: 520,
        }}
      >
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: EE.sageMuted, marginBottom: 8 }}>
          {t.fieldComment}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: `1px solid ${EE.border}`,
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            background: '#fff',
            color: EE.ink,
            outline: 'none',
            resize: 'vertical',
            marginBottom: 16,
          }}
        />

        {sent && <p style={{ fontSize: 13.5, color: '#0F7A3D', marginBottom: 12 }}>{t.contactSent}</p>}
        {error && <p style={{ fontSize: 13.5, color: '#B91C1C', marginBottom: 12 }}>{t.recordFailed}</p>}

        <button
          onClick={handleSubmit}
          disabled={sending || !message.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: EE.emerald,
            color: EE.parchment,
            border: 'none',
            padding: '12px 22px',
            borderRadius: 9,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: sending || !message.trim() ? 'default' : 'pointer',
            opacity: sending || !message.trim() ? 0.6 : 1,
          }}
        >
          <Mail size={15} />
          {t.submit}
        </button>
      </div>
    </div>
  );
}
