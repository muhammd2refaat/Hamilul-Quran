import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, BarChart3, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            <span className="font-bold text-xl tracking-tight">Hamilul-Quran</span>
          </div>
          <nav>
            <Link href="/login">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition-all">
                Login
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-white to-white"></div>
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 mb-8">
            <Star className="mr-1 h-4 w-4 text-amber-500" />
            Empowering your Quranic Journey
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Memorize the Quran <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              with Expert Teachers
            </span>
          </h1>
          <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Hamilul-Quran provides one-on-one sessions, structured memorization tracking, and a community of certified teachers dedicated to your success in memorizing the Holy Quran.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-8 text-lg rounded-full shadow-lg shadow-emerald-200 transition-transform hover:-translate-y-1">
                Start Your Journey
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition-colors">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white border-y border-emerald-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Everything you need to succeed</h2>
            <p className="mt-4 text-lg text-slate-600">A comprehensive platform designed specifically for Tahfiz students and teachers.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center group">
              <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">One-on-One Sessions</h3>
              <p className="text-slate-600 leading-relaxed">
                Connect directly with your teacher through our integrated session allocation system for personalized guidance and recitation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center group">
              <div className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Track Your Progress</h3>
              <p className="text-slate-600 leading-relaxed">
                Detailed session scores, gamification points, and historical tracking to visualize your memorization journey over time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center group">
              <div className="h-16 w-16 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Certified Teachers</h3>
              <p className="text-slate-600 leading-relaxed">
                Learn from qualified instructors who have been carefully vetted to ensure the highest quality of Quranic education.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white mb-6">
            <BookOpen className="h-6 w-6 text-emerald-500" />
            <span className="font-bold text-xl tracking-tight">Hamilul-Quran</span>
          </div>
          <p className="mb-6 max-w-md mx-auto">
            Dedicated to facilitating the memorization and understanding of the Holy Quran for students worldwide.
          </p>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} Hamilul-Quran. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
