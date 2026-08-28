'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

// TODO: have this reviewed by counsel — the Arabic text is the site owner's
// own authored policy (provided 2026-08-28); the English text is a faithful
// translation of that same content, not an independent draft. Neither has
// had a legal review.
const SUPPORT_EMAIL = 'elhafazahacademy111@gmail.com';

type Lang = 'en' | 'ar';

export function PrivacyContent({ initialLang = 'en' }: { initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const otherHref = lang === 'ar' ? '/privacy' : '/ar/privacy';

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <Link href={lang === 'ar' ? '/ar' : '/'} className="flex items-center gap-2 text-emerald-800">
            <BookOpen className="h-7 w-7 text-emerald-600" />
            <span className="font-bold text-2xl tracking-tight">
              {lang === 'ar' ? 'أكاديمية الحفظة' : 'Hamilul-Quran'}
            </span>
          </Link>
          <a
            href={otherHref}
            onClick={(e) => { e.preventDefault(); setLang(lang === 'ar' ? 'en' : 'ar'); }}
            className="inline-flex items-center gap-1.5 border border-emerald-700/30 text-emerald-800 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-emerald-50 transition-colors"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </a>
        </div>

        {lang === 'ar' ? (
          <>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">سياسة الخصوصية</h1>
            <p className="text-sm text-slate-500 mb-10">تاريخ آخر تحديث: 22 أغسطس 2026</p>

            <div className="space-y-8 text-slate-700 leading-relaxed">
              <section>
                <p>
                  مرحباً بكم في أكاديمية الحفظة لتحفيظ القرآن الكريم أونلاين. نولي نحن أكاديمية
                  الحفظة أهمية بالغة لحماية خصوصية بيانات جميع مستخدمي منصتنا من (طلاب، أولياء
                  أمور، ومعلمين). تشرح هذه السياسة كيفية التعامل مع بياناتك عند استخدام موقعنا.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">أولاً: البيانات التي نجمعها وكيفية الحصول عليها</h2>
                <ul className="list-disc ps-6 space-y-3">
                  <li>
                    <strong>بيانات الحساب عبر (Google OAuth):</strong> عند تسجيل الدخول باستخدام
                    حساب جوجل، نطلب الوصول إلى بياناتك الأساسية فقط مع موافقتك الصريحة، والتي
                    تشمل: (الاسم الكامل، البريد الإلكتروني، وصورة الملف الشخصي).
                  </li>
                  <li>
                    <strong>إدارة مواعيد الحلقات (Google Calendar API Scope):</strong> نستخدم فقط
                    النطاق المحدود الخاص بالأحداث التي يتم إنشاؤها عبر تطبيقنا
                    (<code className="text-sm bg-slate-100 px-1 rounded">.../auth/calendar.events</code>).
                    لا نطلع ولا نصل نهائياً إلى أي تقويمات شخصية أو أحداث أخرى موجودة على تقويم
                    جوجل الخاص بك. تقتصر صلاحيتنا فقط على إضافة، تعديل، أو حذف أحداث الحلقات
                    القرآنية الخاصة بالأكاديمية وتوفير رابط اجتماع Google Meet داخل الحدث.
                  </li>
                  <li>
                    <strong>بيانات الكاميرا والصوت:</strong> في سبيل ضمان حسن أداء الطالب ومتابعة
                    مخارج الحروف بدقة أثناء الحلقة، يُفضل فتح الكاميرا. يتم التفاعل المرئي والصوتي
                    بشكل مباشر وحي عبر Google Meet، ولا تقوم المنصة بتسجيل أو تخزين أي مقاطع فيديو
                    أو تسجيلات صوتية للحلقات على خوادمها.
                  </li>
                  <li>
                    <strong>البيانات المالية وإثباتات الدفع:</strong> نجمع فقط السجلات الخاصة
                    بإثبات عملية التسديد والتنسيق المالي التي يتم تبادلها مع الأكاديمية (مثل وصل
                    تحويل، إشعار سداد)، دون الاحتفاظ بأي بيانات بطاقات بنكية سرية.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">ثانياً: كيفية استخدام البيانات</h2>
                <p className="mb-2">نستخدم البيانات للغايات التالية حصراً:</p>
                <ul className="list-disc ps-6 space-y-1">
                  <li>إنشاء ملف التعريف الخاص بالطالب والمعلم على المنصة.</li>
                  <li>ربط الطالب بالمعلم وجدولة المواعيد وتوليد روابط Google Meet التلقائية.</li>
                  <li>التنسيق المالي وإصدار إيصالات الاشتراك أو إجراء عمليات الاسترداد.</li>
                  <li>متابعة الحضور والغياب وتقييم مستوى حفظ الطالب.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">ثالثاً: مشاركة البيانات مع أطراف خارجية</h2>
                <ul className="list-disc ps-6 space-y-2">
                  <li>
                    <strong>خدمات جوجل (Google APIs):</strong> يخضع استخدامنا للبيانات التي نحصل
                    عليها من خدمات Google لسياسة Google API Services User Data Policy، بما في ذلك
                    متطلبات الاستخدام المحدود (Limited Use Requirements).
                  </li>
                  <li>
                    <strong>سرية البيانات:</strong> نحن لا نبيع، ولا نؤجر، ولا نتاجر ببيانات
                    المستخدمين أو نمررها لأي أطراف ثالثة لأغراض إعلانية أو تسويقية.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">رابعاً: حقوق المستخدم وحذف البيانات</h2>
                <ul className="list-disc ps-6 space-y-1">
                  <li>يحق للمستخدم في أي وقت إلغاء ربط حسابه على جوجل بالمنصة عبر إعدادات الأمان في حسابه لدى Google.</li>
                  <li>يمكنك التواصل معنا في أي وقت لتعديل أو حذف حسابك وبياناتك المسجلة لدينا نهائياً.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">التواصل معنا</h2>
                <p>لأي استفسار حول هذه السياسة أو بياناتك، راسلنا على {SUPPORT_EMAIL}.</p>
              </section>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
            <p className="text-sm text-slate-500 mb-10">Last updated: August 22, 2026</p>

            <div className="space-y-8 text-slate-700 leading-relaxed">
              <section>
                <p>
                  Welcome to Elhafazah Academy for online Quran memorization. We at Elhafazah
                  Academy place great importance on protecting the privacy of all our platform
                  users&apos; data (students, guardians, and teachers). This policy explains how
                  your data is handled when you use our website.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Data we collect, and how we obtain it</h2>
                <ul className="list-disc ps-6 space-y-3">
                  <li>
                    <strong>Account data via Google OAuth:</strong> when you sign in with a Google
                    account, we request access to only your basic data, with your explicit
                    consent — namely your full name, email address, and profile picture.
                  </li>
                  <li>
                    <strong>Managing lesson schedules (Google Calendar API scope):</strong> we use
                    only the limited scope for events created through our app
                    (<code className="text-sm bg-slate-100 px-1 rounded">.../auth/calendar.events</code>).
                    We never view or access any personal calendars or other existing events on
                    your Google Calendar. Our permission is limited strictly to adding, editing,
                    or deleting the Academy&apos;s own Quran-session events and providing a Google
                    Meet link within that event.
                  </li>
                  <li>
                    <strong>Camera and audio:</strong> to help ensure the student&apos;s good
                    performance and accurately follow correct pronunciation (makharij al-huruf)
                    during the session, turning on the camera is preferred. Audio/video
                    interaction happens directly and live via Google Meet — the platform does not
                    record or store any video or audio of sessions on its servers.
                  </li>
                  <li>
                    <strong>Financial data and proof of payment:</strong> we collect only records
                    related to proof of payment and financial coordination exchanged with the
                    Academy (such as a transfer receipt or payment notice), and we never retain
                    any confidential bank card data.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">2. How we use your data</h2>
                <p className="mb-2">We use data exclusively for the following purposes:</p>
                <ul className="list-disc ps-6 space-y-1">
                  <li>Creating the student&apos;s and teacher&apos;s profile on the platform.</li>
                  <li>Linking students with teachers, scheduling lessons, and automatically generating Google Meet links.</li>
                  <li>Financial coordination, issuing subscription receipts, and processing refunds.</li>
                  <li>Tracking attendance and evaluating the student&apos;s memorization progress.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Sharing data with third parties</h2>
                <ul className="list-disc ps-6 space-y-2">
                  <li>
                    <strong>Google services (Google APIs):</strong> our use of data obtained from
                    Google services is subject to the Google API Services User Data Policy,
                    including its Limited Use requirements.
                  </li>
                  <li>
                    <strong>Confidentiality:</strong> we do not sell, rent, or trade user data, or
                    pass it to any third party for advertising or marketing purposes.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">4. Your rights and deleting your data</h2>
                <ul className="list-disc ps-6 space-y-1">
                  <li>You may disconnect your Google account from the platform at any time via your Google Account&apos;s security settings.</li>
                  <li>You can contact us at any time to modify or permanently delete your account and the data we hold about you.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Contact us</h2>
                <p>Questions about this policy or your data? Email us at {SUPPORT_EMAIL}.</p>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PrivacyContent;
