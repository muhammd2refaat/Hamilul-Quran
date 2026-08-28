'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

// TODO: have this reviewed by counsel — the Arabic text is the site owner's
// own authored policy (provided 2026-08-28); the English text is a faithful
// translation of that same content, not an independent draft. Neither has
// had a legal review — the refund-policy section in particular is a real
// financial commitment, not boilerplate.
const SUPPORT_EMAIL = 'elhafazahacademy111@gmail.com';

type Lang = 'en' | 'ar';

export function TermsContent({ initialLang = 'en' }: { initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const otherHref = lang === 'ar' ? '/terms' : '/ar/terms';

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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">شروط الخدمة</h1>
            <p className="text-sm text-slate-500 mb-10">تاريخ آخر تحديث: 22 أغسطس 2026</p>

            <div className="space-y-8 text-slate-700 leading-relaxed">
              <section>
                <p>
                  أهلاً بكم في أكاديمية الحفظة لتحفيظ القرآن الكريم أونلاين. يُعتبر استخدامك لموقعنا
                  موافقة كاملة منك على الالتزام بشروط الخدمة التالية:
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">أولاً: إنشاء الحساب والتسجيل</h2>
                <p>يتم التسجيل في المنصة عن طريق حساب جوجل مفعّل ببريد إلكتروني صحيح لكل من الطالب والمعلم.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">ثانياً: نظام الحلقات والمواعيد</h2>
                <ul className="list-disc ps-6 space-y-2">
                  <li>تقوم إدارة المنصة (الإشراف) بربط الطالب بالمعلم وتحديد موعد الحلقة الثابت (Allocation).</li>
                  <li>يُسجل الموعد تلقائياً على تقويم جوجل (Google Calendar) الخاص بالطالب والمعلم، ويُتاح رابط الدخول للحلقة (Google Meet) مباشرة من خلال لوحة التحكم بالموقع.</li>
                  <li>يُفضل فتح الكاميرا أثناء انعقاد الحلقة لضمان حسن الأداء والتأكد من جودة التلقي والضبط بإذن الله.</li>
                  <li>يلتزم المعلم والطالب بالدخول في الموعد المحدد. وفي حال الاعتذار يُرجى إبلاغ الإدارة مسبقاً وفق النظام الداخلي للمنصة.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">ثالثاً: المدفوعات وسياسة الاسترداد (Refund Policy)</h2>
                <ul className="list-disc ps-6 space-y-2">
                  <li><strong>طرق الدفع:</strong> يتم سداد رسوم اشتراك الحلقات عبر وسائط وطرق الدفع المعتمَدة التي ترسلها الأكاديمية للطالب بشكل مباشر.</li>
                  <li><strong>سياسة الاسترداد:</strong> يحق للطالب طلب استرداد مبلغه في أي وقت، وتلتزم الأكاديمية بإعادة المبالغ المستحقة عبر نفس طريقة الدفع التي تم السداد بها، وذلك بعد التنسيق المباشر بين إدارة الأكاديمية والطالب (أو ولي أمره).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">رابعاً: الضوابط السلوكية والخصوصية داخل الحلقة</h2>
                <ul className="list-disc ps-6 space-y-2">
                  <li>يُتوقع من المعلمين والطلاب الالتزام التام بالأخلاق الإسلامية والآداب العامة.</li>
                  <li>يُحظر تماماً تسجيل الحلقات (سواء بالصوت أو الفيديو) أو التقاط صور للشاشة أثناء الحلقة من قِبل أي طرف بدون موافقة مسبقة من إدارة الأكاديمية والطرف الآخر.</li>
                  <li>يُمنع مشاركة رابط Google Meet الخاص بالحلقة مع أي شخص خارجي غير مسجل في المنصة.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">خامساً: التعديلات على الشروط</h2>
                <p>تحتفظ الأكاديمية بحق تحديث سياسة الخصوصية أو شروط الخدمة عند الحاجة، وسيتم تنبيه المستخدمين بأي تغييرات جوهرية عبر الوسائل المتاحة.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">التواصل معنا</h2>
                <p>لأي استفسار حول هذه الشروط، راسلنا على {SUPPORT_EMAIL}.</p>
              </section>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
            <p className="text-sm text-slate-500 mb-10">Last updated: August 22, 2026</p>

            <div className="space-y-8 text-slate-700 leading-relaxed">
              <section>
                <p>
                  Welcome to Elhafazah Academy for online Quran memorization. Your use of our
                  website constitutes your full agreement to comply with the following Terms of
                  Service:
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Account creation and registration</h2>
                <p>Registration on the platform is done via an active Google account with a valid email address, for both students and teachers.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Lesson and scheduling system</h2>
                <ul className="list-disc ps-6 space-y-2">
                  <li>The platform administration links each student with a teacher and sets a fixed lesson schedule (an &quot;Allocation&quot;).</li>
                  <li>The schedule is automatically recorded on the Google Calendar of both the student and the teacher, and the lesson join link (Google Meet) is made available directly through the site&apos;s dashboard.</li>
                  <li>Turning on the camera during the lesson is preferred, to help ensure good performance and confirm the quality of recitation and correction, God willing.</li>
                  <li>Both teacher and student are expected to join at the scheduled time. If unable to attend, please notify the administration in advance per the platform&apos;s internal policy.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Payments and refund policy</h2>
                <ul className="list-disc ps-6 space-y-2">
                  <li><strong>Payment methods:</strong> lesson subscription fees are paid via the approved payment channels the Academy sends directly to the student.</li>
                  <li><strong>Refund policy:</strong> a student may request a refund at any time. The Academy commits to returning any amounts due via the same payment method originally used, following direct coordination between the Academy administration and the student (or their guardian).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">4. Conduct and privacy during lessons</h2>
                <ul className="list-disc ps-6 space-y-2">
                  <li>Teachers and students are expected to fully observe Islamic ethics and general etiquette.</li>
                  <li>Recording a lesson (audio or video) or taking screenshots during a lesson is strictly prohibited for any party, without prior consent from the Academy administration and the other party.</li>
                  <li>Sharing a lesson&apos;s Google Meet link with anyone outside the platform who is not enrolled is prohibited.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">5. Changes to these terms</h2>
                <p>The Academy reserves the right to update this Privacy Policy or these Terms of Service when necessary; users will be notified of any material changes through the available channels.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Contact us</h2>
                <p>Questions about these terms? Email us at {SUPPORT_EMAIL}.</p>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TermsContent;
