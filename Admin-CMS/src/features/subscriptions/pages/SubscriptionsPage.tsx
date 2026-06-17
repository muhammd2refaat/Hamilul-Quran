/**
 * Subscriptions management page — Student & Teacher views
 */

import { useState, useMemo } from 'react';
import {
  Users,
  BookOpen,
  Star,
  AlertCircle,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  PauseCircle,
  Shield,
  Award,
  GraduationCap,
} from 'lucide-react';
import { Card } from '@/shared/components';
import {
  mockStudentSubscriptions,
  mockTeacherSubscriptions,
  type StudentSubscription,
  type TeacherSubscription,
  type SubscriptionStatus,
} from '@/mock-data/subscriptions';
import { format } from 'date-fns';

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  withdrawn: { label: 'Withdrawn', color: 'bg-red-100 text-red-700', icon: XCircle },
  paused: { label: 'Paused', color: 'bg-amber-100 text-amber-700', icon: PauseCircle },
};

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-100'}`}
        />
      ))}
    </span>
  );
}

// ─── Student subscription row (grouped) ───────────────────────────────────────

function StudentRow({ sub }: { sub: StudentSubscription }) {
  const [complaintsOpen, setComplaintsOpen] = useState(false);
  const hasComplaints = sub.complaints.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Student info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{sub.studentName}</p>
            <p className="text-xs text-gray-500">{sub.phone}</p>
          </div>
        </div>

        {/* Join date */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>Joined {format(new Date(sub.joinDate), 'MMM d, yyyy')}</span>
        </div>

        {/* Status */}
        <StatusBadge status={sub.status} />

        {/* Complaints trigger */}
        {hasComplaints && (
          <button
            onClick={() => setComplaintsOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {sub.complaints.length} Complaint{sub.complaints.length > 1 ? 's' : ''}
            {complaintsOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Complaints panel */}
      {hasComplaints && complaintsOpen && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-3 space-y-2">
          {sub.complaints.map((c) => (
            <div key={c.id} className="flex items-start gap-3 bg-white rounded-lg border border-red-200 p-3">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-800">{c.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">
                    {format(new Date(c.date), 'MMM d, yyyy')}
                  </span>
                  {c.resolved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="h-3 w-3" /> Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      <XCircle className="h-3 w-3" /> Open
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Teacher card ─────────────────────────────────────────────────────────────

function TeacherCard({ teacher }: { teacher: TeacherSubscription }) {
  const [tab, setTab] = useState<'reviews' | 'upcoming'>('reviews');

  const avgRating =
    teacher.reviews.reduce((sum, r) => sum + r.rating, 0) / (teacher.reviews.length || 1);

  const studentReviews = teacher.reviews.filter((r) => !r.isAdmin);
  const adminReviews = teacher.reviews.filter((r) => r.isAdmin);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
      {/* Teacher header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-5 py-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{teacher.teacherName}</h3>
          <p className="text-primary-200 text-sm">Age {teacher.age} years</p>
        </div>
        <div className="text-right hidden sm:block">
          <StarRating value={Math.round(avgRating)} />
          <p className="text-primary-200 text-xs mt-0.5">{avgRating.toFixed(1)} / 5</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Students', value: teacher.studentCount, icon: Users },
            { label: 'Sessions', value: teacher.sessionCount, icon: CheckCircle },
            { label: 'Upcoming', value: teacher.upcomingSessions.length, icon: Calendar },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100"
            >
              <Icon className="h-5 w-5 text-primary-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Qualifications */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            <Award className="h-3.5 w-3.5" /> Qualifications
          </div>
          <ul className="space-y-1">
            {teacher.qualifications.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                {q}
              </li>
            ))}
          </ul>
        </div>

        {/* Tabs: Reviews / Upcoming */}
        <div>
          <div className="flex border-b border-gray-200 mb-3">
            {(['reviews', 'upcoming'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'reviews' ? 'Reviews' : 'Upcoming Sessions'}
              </button>
            ))}
          </div>

          {/* Reviews tab */}
          {tab === 'reviews' && (
            <div className="space-y-3">
              {/* Admin reviews */}
              {adminReviews.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <Shield className="h-3.5 w-3.5 text-primary-500" /> Admin Reviews
                  </div>
                  <div className="space-y-2">
                    {adminReviews.map((r) => (
                      <div
                        key={r.id}
                        className="bg-primary-50 border border-primary-100 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-primary-900">
                            {r.reviewerName}
                          </span>
                          <StarRating value={r.rating} />
                        </div>
                        <p className="text-xs text-gray-600 italic">"{r.comment}"</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(r.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student reviews */}
              {studentReviews.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-500" /> Student Reviews
                  </div>
                  <div className="space-y-2">
                    {studentReviews.map((r) => (
                      <div
                        key={r.id}
                        className="bg-gray-50 border border-gray-100 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{r.reviewerName}</span>
                          <StarRating value={r.rating} />
                        </div>
                        <p className="text-xs text-gray-600 italic">"{r.comment}"</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(r.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teacher.reviews.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No reviews yet.</p>
              )}
            </div>
          )}

          {/* Upcoming sessions tab */}
          {tab === 'upcoming' && (
            <div className="space-y-2">
              {teacher.upcomingSessions.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No upcoming sessions.</p>
              )}
              {teacher.upcomingSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-3 py-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.studentName}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(s.date), 'EEE, MMM d')} · {s.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | ''>('');
  const [teacherFilter, setTeacherFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Unique teacher names for filter
  const teacherNames = useMemo(
    () => Array.from(new Set(mockStudentSubscriptions.map((s) => s.teacherName))).sort(),
    []
  );

  // Group students by teacher
  const groupedStudents = useMemo(() => {
    let subs = mockStudentSubscriptions;

    if (search) {
      const q = search.toLowerCase();
      subs = subs.filter(
        (s) => s.studentName.toLowerCase().includes(q) || s.phone.includes(q)
      );
    }
    if (statusFilter) subs = subs.filter((s) => s.status === statusFilter);
    if (teacherFilter) subs = subs.filter((s) => s.teacherName === teacherFilter);

    const groups: Record<string, { age: number; subs: StudentSubscription[] }> = {};
    for (const sub of subs) {
      if (!groups[sub.teacherName]) {
        groups[sub.teacherName] = { age: sub.teacherAge, subs: [] };
      }
      groups[sub.teacherName].subs.push(sub);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [search, statusFilter, teacherFilter]);

  // Teacher search
  const [teacherSearch, setTeacherSearch] = useState('');
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch) return mockTeacherSubscriptions;
    const q = teacherSearch.toLowerCase();
    return mockTeacherSubscriptions.filter((t) =>
      t.teacherName.toLowerCase().includes(q)
    );
  }, [teacherSearch]);

  // Summary counts
  const totalActive = mockStudentSubscriptions.filter((s) => s.status === 'active').length;
  const totalWithdrawn = mockStudentSubscriptions.filter((s) => s.status === 'withdrawn').length;
  const totalPaused = mockStudentSubscriptions.filter((s) => s.status === 'paused').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage student subscriptions and teacher profiles.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Students',
            value: mockStudentSubscriptions.length,
            icon: GraduationCap,
            color: 'bg-primary-50 text-primary-700',
            iconBg: 'bg-primary-100',
          },
          {
            label: 'Active',
            value: totalActive,
            icon: CheckCircle,
            color: 'bg-emerald-50 text-emerald-700',
            iconBg: 'bg-emerald-100',
          },
          {
            label: 'Paused',
            value: totalPaused,
            icon: PauseCircle,
            color: 'bg-amber-50 text-amber-700',
            iconBg: 'bg-amber-100',
          },
          {
            label: 'Withdrawn',
            value: totalWithdrawn,
            icon: XCircle,
            color: 'bg-red-50 text-red-700',
            iconBg: 'bg-red-100',
          },
        ].map(({ label, value, icon: Icon, color, iconBg }) => (
          <Card key={label} className={`flex items-center gap-4 p-4 ${color}`}>
            <div className={`${iconBg} rounded-xl p-2.5`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium opacity-80">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {(['students', 'teachers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              activeTab === t
                ? 'bg-white shadow-sm text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'students' ? '🎓 Students' : '📖 Teachers'}
          </button>
        ))}
      </div>

      {/* ── Students Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-72 focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | '')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-400 focus:border-primary-400"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-400 focus:border-primary-400 min-w-[200px]"
            >
              <option value="">All Teachers</option>
              {teacherNames.map((tn) => (
                <option key={tn} value={tn}>{tn}</option>
              ))}
            </select>
          </div>

          {/* Grouped list */}
          {groupedStudents.length === 0 ? (
            <Card className="p-10 text-center text-gray-400">
              No subscriptions match the selected filters.
            </Card>
          ) : (
            groupedStudents.map(([teacherName, { age, subs }]) => (
              <div key={teacherName}>
                {/* Teacher group header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-700 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{teacherName}</h2>
                    <p className="text-xs text-gray-500">Age {age} · {subs.length} student{subs.length > 1 ? 's' : ''}</p>
                  </div>
                  <div className="ml-auto h-px flex-1 bg-gray-200" />
                </div>

                <div className="space-y-2">
                  {subs.map((sub) => (
                    <StudentRow key={sub.id} sub={sub} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Teachers Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search teachers…"
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-72 focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
          {filteredTeachers.length === 0 ? (
            <Card className="p-10 text-center text-gray-400">No teachers found.</Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTeachers.map((t) => (
                <TeacherCard key={t.id} teacher={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SubscriptionsPage;
