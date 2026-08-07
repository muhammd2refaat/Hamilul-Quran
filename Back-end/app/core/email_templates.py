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


def _dir_align(lang: Lang) -> tuple[str, str]:
    return ("rtl", "right") if lang == "ar" else ("ltr", "left")


def _shell(*, lang: Lang, subject: str, preheader: str, body_rows: str) -> str:
    """Wraps pre-built <tr> row(s) (header/footer included by the caller via
    _header_row/_footer_row) in the shared card/table skeleton."""
    dir_, _ = _dir_align(lang)
    return f"""\
<!DOCTYPE html>
<html dir="{dir_}" lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{escape(subject)}</title>
</head>
<body style="margin:0; padding:0; background:{_PARCHMENT}; font-family:{_FONT};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">{escape(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_PARCHMENT};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden;
                      box-shadow:0 8px 30px rgba(12,51,38,.12);">
{body_rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _header_row(lang: Lang) -> str:
    _, align = _dir_align(lang)
    pad_side = "right" if lang == "ar" else "left"
    return f"""\
          <tr>
            <td style="background:{_DARK}; padding:28px 32px;" align="{align}">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:44px; height:44px; border:1.5px solid {_GOLD}; border-radius:9px;
                             text-align:center; vertical-align:middle;">
                    <span style="font-size:26px; font-weight:700; color:{_GOLD}; line-height:44px;">ح</span>
                  </td>
                  <td style="padding-{pad_side}:13px;">
                    <div style="font-size:18px; font-weight:700; letter-spacing:.5px; color:{_PARCHMENT};">ELHAFAZAH ACADEMY</div>
                    <div style="font-size:12px; color:#9DB5A0;">أكاديمية الحفظة</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>"""


def _footer_row(lang: Lang, footer_tag: str, copyright_: str) -> str:
    _, align = _dir_align(lang)
    return f"""\
          <tr>
            <td style="background:#0A2A20; padding:22px 32px;" align="{align}">
              <div style="font-size:12.5px; color:#9DB5A0;">{escape(footer_tag)}</div>
              <div style="font-size:11.5px; color:#6E8472; margin-top:6px;">{escape(copyright_)}</div>
            </td>
          </tr>"""


def _callout_row(lang: Lang, text: str) -> str:
    """Dark, gold-checkmark reassurance banner — used at the bottom of the
    body in both the trial-confirmation and welcome emails."""
    _, align = _dir_align(lang)
    return f"""\
          <tr>
            <td style="padding:0 32px 34px;" align="{align}">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:{_DARK}; border-radius:10px; padding:16px 20px;">
                    <span style="color:{_GOLD}; font-size:14px; font-weight:600;">✓</span>
                    <span style="color:{_PARCHMENT}; font-size:14px; font-weight:500;"> {escape(text)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>"""


# ── Free-trial confirmation ─────────────────────────────────────────────────

_TRIAL_COPY = {
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
    c = _TRIAL_COPY.get(lang, _TRIAL_COPY["en"])
    _, align = _dir_align(lang)

    subject = (
        "استلمنا طلب حصتك التجريبية — أكاديمية الحفظة"
        if lang == "ar"
        else "We've received your free trial request — Elhafazah Academy"
    )

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

    body_row = f"""\
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
          </tr>"""

    html_body = _shell(
        lang=lang,
        subject=subject,
        preheader=c["preheader"],
        body_rows="\n".join([
            _header_row(lang),
            body_row,
            _callout_row(lang, c["reassurance"]),
            _footer_row(lang, c["footerTag"], c["copyright"]),
        ]),
    )
    return subject, text_body, html_body


# ── New-account welcome ─────────────────────────────────────────────────────

_WELCOME_COPY = {
    "en": {
        "student": {
            "preheader": "Welcome to Elhafazah Academy — we'll be in touch soon.",
            "greeting": "As-salamu alaykum, {name}! Welcome aboard.",
            "intro": "Your account is ready. Elhafazah Academy pairs students "
                     "around the world with certified teachers for live, "
                     "one-on-one lessons in Hifz (memorization), Tajweed, and "
                     "Noorani Qaida — personalised to your level, goals, and "
                     "schedule.",
            "whatNext": "We'll reach out soon to help you get set up, match you "
                        "with the right teacher, and book your first session.",
        },
        "teacher": {
            "preheader": "Welcome to Elhafazah Academy — we'll be in touch soon.",
            "greeting": "As-salamu alaykum, {name}! Welcome aboard.",
            "intro": "Your teacher account is ready. Elhafazah Academy connects "
                     "certified teachers with students worldwide for live, "
                     "one-on-one lessons in Hifz, Tajweed, and Noorani Qaida — "
                     "so you can teach on a schedule that works for you.",
            "whatNext": "We'll reach out soon to help you finish setting up your "
                        "profile and get matched with your first students.",
        },
        "footerTag": "Nurturing a love for the Qur’an, one āyah at a time.",
        "copyright": "© 2025 Elhafazah Academy",
    },
    "ar": {
        "student": {
            "preheader": "مرحبًا بك في أكاديمية الحفظة — سنتواصل معك قريبًا.",
            "greeting": "السلام عليكم، {name}! أهلاً بك معنا.",
            "intro": "حسابك جاهز الآن. تربط أكاديمية الحفظة الطلاب حول العالم "
                     "بمعلّمين مجازين لحصص مباشرة فردية في الحفظ والتجويد "
                     "والقاعدة النورانية — مخصّصة لمستواك وأهدافك وجدولك.",
            "whatNext": "سنتواصل معك قريبًا لمساعدتك على إعداد حسابك، واختيار "
                        "المعلّم المناسب لك، وحجز حصتك الأولى.",
        },
        "teacher": {
            "preheader": "مرحبًا بك في أكاديمية الحفظة — سنتواصل معك قريبًا.",
            "greeting": "السلام عليكم، {name}! أهلاً بك معنا.",
            "intro": "حساب المعلّم الخاص بك جاهز الآن. تربط أكاديمية الحفظة "
                     "المعلّمين المجازين بطلاب حول العالم لحصص مباشرة فردية "
                     "في الحفظ والتجويد والقاعدة النورانية — على الجدول الذي "
                     "يناسبك.",
            "whatNext": "سنتواصل معك قريبًا لمساعدتك على استكمال إعداد ملفك "
                        "الشخصي وربطك بأول طلابك.",
        },
        "footerTag": "نغرس حبّ القرآن، آيةً بعد آية.",
        "copyright": "© ٢٠٢٥ أكاديمية الحفظة",
    },
}

Role = Literal["student", "teacher"]


def build_welcome_email(
    *, name: str, role: Role, lang: Lang = "en"
) -> tuple[str, str, str]:
    """Returns (subject, plain_text_body, html_body) for the welcome email
    sent right after a new account is created via Google signup — see
    GoogleAuthService._send_welcome_email()."""
    c = _WELCOME_COPY.get(lang, _WELCOME_COPY["en"])
    r = c.get(role, c["student"])
    _, align = _dir_align(lang)

    subject = (
        "أهلاً بك في أكاديمية الحفظة!" if lang == "ar" else "Welcome to Elhafazah Academy!"
    )

    text_body = "\n".join([
        r["greeting"].format(name=name),
        "",
        r["intro"],
        "",
        r["whatNext"],
        "",
        "— Elhafazah Academy",
    ])

    body_row = f"""\
          <tr>
            <td style="padding:34px 32px 10px;" align="{align}">
              <h1 style="margin:0 0 14px; font-size:22px; font-weight:700; color:{_INK};">
                {escape(r["greeting"].format(name=name))}
              </h1>
              <p style="margin:0 0 20px; font-size:14.5px; line-height:1.7; color:{_MUTED};">
                {escape(r["intro"])}
              </p>
            </td>
          </tr>"""

    html_body = _shell(
        lang=lang,
        subject=subject,
        preheader=r["preheader"],
        body_rows="\n".join([
            _header_row(lang),
            body_row,
            _callout_row(lang, r["whatNext"]),
            _footer_row(lang, c["footerTag"], c["copyright"]),
        ]),
    )
    return subject, text_body, html_body
