"""
core/email_templates.py
========================
HTML (+ plain-text fallback) email bodies, styled to match the public
landing page (Frontend/components/landing/LandingPage.tsx) — same palette
(dark green / gold / parchment) and wordmark, built as table-based HTML
with inline styles for compatibility across email clients (no flexbox/grid,
no external CSS, no background-image patterns — those don't render reliably
in email the way they do on the web).
"""
from html import escape
from typing import Literal

# Same palette as the landing page.
_DARK = "#0C3326"
_GOLD = "#D9B45F"
_PARCHMENT = "#F1EBDD"
_INK = "#10241C"
_MUTED = "#5C6B5F"
_FONT = "'Segoe UI', Helvetica, Arial, sans-serif"

Lang = Literal["en", "ar"]

_COPY = {
    "en": {
        "preheader": "We received your free trial request — we'll be in touch soon.",
        "greeting": "As-salamu alaykum, {name}!",
        "intro": "Thank you for requesting a free trial with Elhafazah Academy. "
                 "We've received your details below and will contact you within "
                 "24 hours to schedule your first, no-commitment lesson.",
        "detailsTitle": "What you told us",
        "labelProgram": "Program",
        "labelPhone": "WhatsApp / phone",
        "labelMessage": "Message",
        "reassurance": "No card required, and completely free — we're looking "
                        "forward to reciting with you.",
        "footerTag": "Nurturing a love for the Qur’an, one āyah at a time.",
        "copyright": "© 2025 Elhafazah Academy",
    },
    "ar": {
        "preheader": "استلمنا طلب حصتك التجريبية المجانية — سنتواصل معك قريبًا.",
        "greeting": "السلام عليكم، {name}!",
        "intro": "شكرًا لك على طلب حصة تجريبية مجانية مع أكاديمية الحفظة. "
                 "استلمنا بياناتك أدناه وسنتواصل معك خلال ٢٤ ساعة لتحديد "
                 "موعد حصتك الأولى دون أي التزام.",
        "detailsTitle": "البيانات التي أرسلتها",
        "labelProgram": "البرنامج",
        "labelPhone": "رقم الواتساب / الهاتف",
        "labelMessage": "رسالتك",
        "reassurance": "دون بطاقة ودون أي تكلفة — نتطلع لتلاوة القرآن معك.",
        "footerTag": "نغرس حبّ القرآن، آيةً بعد آية.",
        "copyright": "© ٢٠٢٥ أكاديمية الحفظة",
    },
}


def build_trial_confirmation_email(
    *,
    name: str,
    program: str | None,
    phone: str | None,
    message: str | None,
    lang: Lang = "en",
) -> tuple[str, str, str]:
    """Returns (subject, plain_text_body, html_body) for the "we got your
    free-trial request" confirmation sent to whoever filed it — guest or
    an already-registered student, see RequestService._send_trial_confirmation."""
    c = _COPY.get(lang, _COPY["en"])
    dir_ = "rtl" if lang == "ar" else "ltr"
    align = "right" if lang == "ar" else "left"

    subject = (
        "استلمنا طلب حصتك التجريبية — أكاديمية الحفظة"
        if lang == "ar"
        else "We've received your free trial request — Elhafazah Academy"
    )

    # ── Plain-text fallback ──────────────────────────────────────────────
    text_lines = [
        c["greeting"].format(name=name),
        "",
        c["intro"],
        "",
        f"{c['detailsTitle']}:",
    ]
    if program:
        text_lines.append(f"  {c['labelProgram']}: {program}")
    if phone:
        text_lines.append(f"  {c['labelPhone']}: {phone}")
    if message:
        text_lines.append(f"  {c['labelMessage']}: {message}")
    text_lines += ["", c["reassurance"], "", "— Elhafazah Academy"]
    text_body = "\n".join(text_lines)

    # ── HTML ─────────────────────────────────────────────────────────────
    rows_html = ""
    for label, value in (
        (c["labelProgram"], program),
        (c["labelPhone"], phone),
        (c["labelMessage"], message),
    ):
        if not value:
            continue
        rows_html += f"""
          <tr>
            <td style="padding:6px 0; font-size:12px; font-weight:600; letter-spacing:.5px;
                       text-transform:uppercase; color:{_MUTED}; width:38%;">{escape(label)}</td>
            <td style="padding:6px 0; font-size:14px; color:{_INK};">{escape(value)}</td>
          </tr>"""

    html_body = f"""\
<!DOCTYPE html>
<html dir="{dir_}" lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{escape(subject)}</title>
</head>
<body style="margin:0; padding:0; background:{_PARCHMENT}; font-family:{_FONT};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">{escape(c["preheader"])}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_PARCHMENT};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden;
                      box-shadow:0 8px 30px rgba(12,51,38,.12);">

          <!-- Header -->
          <tr>
            <td style="background:{_DARK}; padding:28px 32px;" align="{align}">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:44px; height:44px; border:1.5px solid {_GOLD}; border-radius:9px;
                             text-align:center; vertical-align:middle;">
                    <span style="font-size:26px; font-weight:700; color:{_GOLD}; line-height:44px;">ح</span>
                  </td>
                  <td style="padding-{('right' if lang == 'ar' else 'left')}:13px;">
                    <div style="font-size:18px; font-weight:700; letter-spacing:.5px; color:{_PARCHMENT};">ELHAFAZAH ACADEMY</div>
                    <div style="font-size:12px; color:#9DB5A0;">أكاديمية الحفظة</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:34px 32px 10px;" align="{align}">
              <h1 style="margin:0 0 14px; font-size:22px; font-weight:700; color:{_INK};">
                {escape(c["greeting"].format(name=name))}
              </h1>
              <p style="margin:0 0 24px; font-size:14.5px; line-height:1.7; color:{_MUTED};">
                {escape(c["intro"])}
              </p>
            </td>
          </tr>

          <!-- Details card -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background:{_PARCHMENT}; border-radius:10px; padding:18px 20px;">
                <tr>
                  <td>
                    <div style="font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase;
                                color:#B08A2E; margin-bottom:10px;">{escape(c["detailsTitle"])}</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="{align}">
                      {rows_html}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reassurance -->
          <tr>
            <td style="padding:0 32px 34px;" align="{align}">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:{_DARK}; border-radius:10px; padding:16px 20px;">
                    <span style="color:{_GOLD}; font-size:14px; font-weight:600;">✓</span>
                    <span style="color:{_PARCHMENT}; font-size:14px; font-weight:500;"> {escape(c["reassurance"])}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0A2A20; padding:22px 32px;" align="{align}">
              <div style="font-size:12.5px; color:#9DB5A0;">{escape(c["footerTag"])}</div>
              <div style="font-size:11.5px; color:#6E8472; margin-top:6px;">{escape(c["copyright"])}</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body
