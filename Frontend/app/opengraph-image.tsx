import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Elhafazah Academy — Online Qur’an Memorization, Tajweed & Hifz';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Shared across both locales (Next picks this up for both / and /ar unless
// overridden) — kept to Latin glyphs only since satori's default font can't
// render Arabic without an explicitly bundled font file; the per-page <meta>
// title/description are already localized regardless of this image.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0C3326',
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(217,180,95,.16) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(217,180,95,.12) 0%, transparent 45%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 120,
            height: 120,
            borderRadius: 22,
            border: '3px solid #D9B45F',
            background: 'rgba(217,180,95,.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            color: '#D9B45F',
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          ح
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#F1EBDD',
            marginBottom: 18,
          }}
        >
          ELHAFAZAH ACADEMY
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#D9B45F', fontWeight: 600 }}>
          Online Qur’an Memorization · Tajweed · Hifz
        </div>
      </div>
    ),
    { ...size }
  );
}
