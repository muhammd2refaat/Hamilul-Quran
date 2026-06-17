/**
 * Teachers page — list cards with qualifications, reviews, and students per teacher
 */

import { useState, useMemo } from 'react';
import {
  BookOpen,
  Star,
  Users,
  CheckCircle,
  Shield,
  GraduationCap,
  Award,
  ChevronDown,
  ChevronRight,
  Search,
  Phone,
  AlertCircle,
  XCircle,
  PauseCircle,
} from 'lucide-react';
import {
  mockTeacherSubscriptions,
  mockStudentSubscriptions,
  type TeacherSubscription,
  type StudentSubscription,
  type SubscriptionStatus,
} from '@/mock-data/subscriptions';
import { format } from 'date-fns';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}`}
        />
      ))}
    </span>
  );
}

const STATUS_CFG: Record<SubscriptionStatus, { label: string; cls: string; icon: React.ElementType }> = {
  active:    { label: 'Active',     cls: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  withdrawn: { label: 'Withdrawn',  cls: 'bg-red-100 text-red-700',         icon: XCircle },
  paused:    { label: 'Paused',     cls: 'bg-amber-100 text-amber-700',     icon: PauseCircle },
};

function StatusPill({ status }: { status: SubscriptionStatus }) {
  const { label, cls, icon: Icon } = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

// ─── Mini student row inside teacher card ────────────────────────────────────

function StudentMiniCard({ s }: { s: StudentSubscription }) {
  const hasComplaints = s.complaints.length > 0;
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
        <GraduationCap className="h-4 w-4 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{s.studentName}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Phone className="h-3 w-3" /> {s.phone}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusPill status={s.status} />
        {hasComplaints && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            <AlertCircle className="h-3 w-3" />
            {s.complaints.length} complaint{s.complaints.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Accordion row ────────────────────────────────────────────────────────────

function Accordion({
  icon,
  label,
  badge,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}
          {label}
          {badge && <span className="text-xs font-normal text-gray-400 ml-1">({badge})</span>}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-4 pt-0">{children}</div>}
    </div>
  );
}

// ─── Teacher list card ────────────────────────────────────────────────────────

function TeacherListCard({
  teacher,
  students,
}: {
  teacher: TeacherSubscription;
  students: StudentSubscription[];
}) {
  const adminReviews   = teacher.reviews.filter((r) => r.isAdmin);
  const studentReviews = teacher.reviews.filter((r) => !r.isAdmin);
  const avgRating =
    teacher.reviews.length > 0
      ? teacher.reviews.reduce((s, r) => s + r.rating, 0) / teacher.reviews.length
      : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 bg-gradient-to-r from-primary-700 to-primary-900">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{teacher.teacherName}</h2>
            <p className="text-primary-200 text-sm">Age {teacher.age} years</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2 text-white">
            <Users className="h-4 w-4 text-primary-200" />
            <span className="text-sm font-semibold">{teacher.studentCount}</span>
            <span className="text-xs text-primary-300 hidden sm:inline">Students</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2 text-white">
            <CheckCircle className="h-4 w-4 text-primary-200" />
            <span className="text-sm font-semibold">{teacher.sessionCount}</span>
            <span className="text-xs text-primary-300 hidden sm:inline">Sessions</span>
          </div>
          <div className="flex flex-col items-center bg-white/10 rounded-xl px-3 py-2">
            <StarRating value={Math.round(avgRating)} />
            <span className="text-xs text-primary-300 mt-0.5">{avgRating.toFixed(1)} / 5</span>
          </div>
        </div>
      </div>

      {/* Accordions */}
      <Accordion
        icon={<Award className="h-4 w-4 text-primary-500" />}
        label="Qualifications"
        badge={String(teacher.qualifications.length)}
      >
        <ul className="space-y-1.5">
          {teacher.qualifications.map((q, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-400 flex-shrink-0" />
              {q}
            </li>
          ))}
        </ul>
      </Accordion>

      <Accordion
        icon={<Star className="h-4 w-4 text-amber-400" />}
        label="Reviews"
        badge={`${teacher.reviews.length} total · ${adminReviews.length} admin`}
      >
        <div className="space-y-4">
          {adminReviews.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 uppercase tracking-wide mb-2">
                <Shield className="h-3.5 w-3.5" /> Admin Reviews
              </div>
              <div className="space-y-2">
                {adminReviews.map((r) => (
                  <div key={r.id} className="bg-primary-50 border border-primary-100 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-primary-900">{r.reviewerName}</span>
                      <StarRating value={r.rating} />
                    </div>
                    <p className="text-sm text-gray-700 italic">"{r.comment}"</p>
                    <p className="text-xs text-gray-400 mt-1.5">{format(new Date(r.date), 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {studentReviews.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                <GraduationCap className="h-3.5 w-3.5" /> Student Reviews
              </div>
              <div className="space-y-2">
                {studentReviews.map((r) => (
                  <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-900">{r.reviewerName}</span>
                      <StarRating value={r.rating} />
                    </div>
                    <p className="text-sm text-gray-700 italic">"{r.comment}"</p>
                    <p className="text-xs text-gray-400 mt-1.5">{format(new Date(r.date), 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {teacher.reviews.length === 0 && <p className="text-sm text-gray-400 py-2">No reviews yet.</p>}
        </div>
      </Accordion>

      {/* Students accordion */}
      <Accordion
        icon={<GraduationCap className="h-4 w-4 text-emerald-600" />}
        label="Students"
        badge={`${students.length} enrolled`}
      >
        {students.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No students currently assigned.</p>
        ) : (
          <div className="space-y-2">
            {students.map((s) => (
              <StudentMiniCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </Accordion>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TeachersPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return mockTeacherSubscriptions;
    const q = search.toLowerCase();
    return mockTeacherSubscriptions.filter(
      (t) =>
        t.teacherName.toLowerCase().includes(q) ||
        t.qualifications.some((ql) => ql.toLowerCase().includes(q))
    );
  }, [search]);

  const totalStudents = mockTeacherSubscriptions.reduce((s, t) => s + t.studentCount, 0);
  const totalSessions = mockTeacherSubscriptions.reduce((s, t) => s + t.sessionCount, 0);

  // Pre-group students by teacher name for O(1) lookup in render
  const studentsByTeacher = useMemo(() => {
    const map: Record<string, StudentSubscription[]> = {};
    for (const s of mockStudentSubscriptions) {
      if (!map[s.teacherName]) map[s.teacherName] = [];
      map[s.teacherName].push(s);
    }
    return map;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {mockTeacherSubscriptions.length} teachers · {totalStudents} students · {totalSessions} sessions completed
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Teachers',       value: mockTeacherSubscriptions.length, icon: BookOpen,    bg: 'bg-primary-50', text: 'text-primary-700', iconBg: 'bg-primary-100' },
          { label: 'Total Students', value: totalStudents,                   icon: Users,       bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
          { label: 'Total Sessions', value: totalSessions,                   icon: CheckCircle, bg: 'bg-amber-50',   text: 'text-amber-700',   iconBg: 'bg-amber-100' },
        ].map(({ label, value, icon: Icon, bg, text, iconBg }) => (
          <div key={label} className={`${bg} ${text} rounded-xl border border-gray-200 p-4 flex items-center gap-3`}>
            <div className={`${iconBg} rounded-xl p-2.5`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium opacity-80">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or qualification…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      {/* Teacher list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          No teachers match your search.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((t) => (
            <TeacherListCard
              key={t.id}
              teacher={t}
              students={studentsByTeacher[t.teacherName] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TeachersPage;
