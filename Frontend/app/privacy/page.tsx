import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy',
};

// TODO: have this reviewed by counsel — this draft exists to unblock
// Google OAuth verification, not as a finished legal document.
const SUPPORT_EMAIL = 'elhafazahacademy111@gmail.com';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="flex items-center gap-2 text-emerald-800 mb-10">
          <BookOpen className="h-7 w-7 text-emerald-600" />
          <span className="font-bold text-2xl tracking-tight">Hamilul-Quran</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: July 3, 2026</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Who we are</h2>
            <p>
              Hamilul-Quran ("we", "us", "our") is an online platform connecting students with
              qualified teachers for live Quran memorization (Hifz), Tajweed, and Noorani Qaida
              lessons. This policy explains what information we collect when you sign up or use
              the platform, and how we use it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Information we collect</h2>
            <p className="mb-3">When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>From Google Sign-In:</strong> your name, email address, and Google account identifier.</li>
              <li>
                <strong>If you sign up as a Student:</strong> country of residence, phone number,
                age, and gender.
              </li>
              <li>
                <strong>If you sign up as a Teacher:</strong> age, whether you have taught online
                before, the number of Juz you have memorized, any ijaza(s) (certifications) you
                hold, and an uploaded certificate document.
              </li>
              <li>
                <strong>Lesson activity:</strong> session attendance, scores, and teacher-student
                assignment history, used to track learning progress.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Google Calendar access</h2>
            <p>
              During sign-in, we request permission to create and manage events on your Google
              Calendar (the <code className="text-sm bg-slate-100 px-1 rounded">calendar.events</code> scope).
              We use this <strong>solely to schedule, update, and manage your Quran lesson
              sessions</strong> — for example, creating a calendar event when a lesson is booked
              with your teacher, or checking your availability to avoid double-booking. While this
              permission technically allows access to events across your calendar, we do not
              access, read, store, or share the content of any calendar events that are unrelated
              to scheduling your lessons on this platform.
            </p>
            <p className="mt-2">
              You can revoke this access at any time from your
              {' '}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-emerald-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Account permissions page
              </a>
              . Revoking access may limit or disable lesson-scheduling features on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">4. How we use your information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and manage your account and authenticate you securely.</li>
              <li>To match students with suitable teachers and manage lesson scheduling.</li>
              <li>To verify teacher qualifications (ijaza, certificates) before they can teach.</li>
              <li>To track learning progress (session scores, attendance history).</li>
              <li>To communicate with you about your account or lessons.</li>
            </ul>
            <p className="mt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">5. How we store and protect your data</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Passwords (for accounts that use email/password login) are hashed and never stored in plain text.</li>
              <li>Google OAuth refresh tokens are encrypted at rest before being stored.</li>
              <li>Access to your data is restricted to what each part of our system needs to function.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">6. Children's use of this platform</h2>
            <p>
              Hamilul-Quran is designed to be used by learners of all ages, including children,
              typically under the supervision of a parent or guardian who is responsible for the
              account. If you are a parent or guardian and believe your child has provided us with
              personal information without your consent, please contact us at {SUPPORT_EMAIL} and
              we will take appropriate steps to review and, if necessary, remove that information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">7. Your rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data at any
              time by contacting us at {SUPPORT_EMAIL}. Deleting your account will also disconnect
              any linked Google account access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">8. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be reflected by
              updating the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">9. Contact us</h2>
            <p>
              Questions about this policy or your data? Email us at {SUPPORT_EMAIL}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
