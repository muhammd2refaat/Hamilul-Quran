import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service',
};

// TODO: have this reviewed by counsel — this draft exists to unblock
// Google OAuth verification, not as a finished legal document.
const SUPPORT_EMAIL = 'elhafazahacademy111@gmail.com';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="flex items-center gap-2 text-emerald-800 mb-10">
          <BookOpen className="h-7 w-7 text-emerald-600" />
          <span className="font-bold text-2xl tracking-tight">Hamilul-Quran</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: July 3, 2026</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Acceptance of terms</h2>
            <p>
              By creating an account or using Hamilul-Quran ("the Service"), you agree to these
              Terms of Service and our Privacy Policy. If you are creating an account on behalf of
              a child, you confirm you are their parent or legal guardian and consent to their use
              of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Description of the Service</h2>
            <p>
              Hamilul-Quran connects students with teachers for live, one-on-one online Quran
              memorization, Tajweed, and Noorani Qaida instruction, including account management,
              teacher-student matching, and lesson scheduling (including optional Google Calendar
              integration).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Accounts</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You are responsible for the accuracy of the information you provide during signup.</li>
              <li>You are responsible for keeping your login credentials secure.</li>
              <li>Teachers must provide accurate qualification information (ijaza, certificates); we may verify or remove teachers who provide false credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide false identity, age, or qualification information.</li>
              <li>Use the Service for any purpose other than legitimate Quran education.</li>
              <li>Harass, abuse, or discriminate against other users.</li>
              <li>Attempt to circumvent the platform's security or scheduling systems.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">5. Google account integration</h2>
            <p>
              If you choose to sign in with Google, you authorize us to access the information
              described in our Privacy Policy, including limited Google Calendar access used to
              schedule your lessons. You can disconnect this access at any time through your Google
              Account settings; doing so may limit certain scheduling features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">6. Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these terms, provide false
              information, or engage in behavior that harms other users or the platform. You may
              stop using the Service and request account deletion at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">7. Disclaimer</h2>
            <p>
              The Service is provided "as is." We do not guarantee uninterrupted availability and
              are not responsible for the conduct of individual teachers or students beyond our
              reasonable verification efforts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">8. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the Service after
              changes take effect constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">9. Contact us</h2>
            <p>Questions about these terms? Email us at {SUPPORT_EMAIL}.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
