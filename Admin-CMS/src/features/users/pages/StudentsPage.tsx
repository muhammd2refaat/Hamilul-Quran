/**
 * Students page — standalone student cards, no teacher grouping at top level
 * Each card: status + subscription info, complaints (always), teacher (expand), scores (expand)
 */

import { useState, useMemo } from 'react';
import {
  GraduationCap,
  Phone,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  PauseCircle,
  ChevronDown,
  ChevronRight,
  Search,
  History,
  User,
  Star,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import {
  mockStudentSubscriptions,
  type StudentSubscription,
  type SubscriptionStatus,
  type SessionScore,
} from '@/mock-data/subscriptions';
import { format } from 'date-fns';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  SubscriptionStatus,
  { label: string; badge: string; bar: string; icon: React.ElementType }
> = {
  active:    { label: 'Active',    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'border-l-emerald-500', icon: CheckCircle },
  withdrawn: { label: 'Withdrawn', badge: 'bg-red-100 text-red-700 border-red-200',             bar: 'border-l-red-400',     icon: XCircle },
  paused:    { label: 'Paused',    badge: 'bg-amber-100 text-amber-700 border-amber-200',        bar: 'border-l-amber-400',   icon: PauseCircle },
};

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const { label, badge, icon: Icon } = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color =
    pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-12 text-right">
        {score}/{max}
      </span>
    </div>
  );
}

// ─── Accordion wrapper ────────────────────────────────────────────────────────

function Accordion({
  icon,
  label,
  meta,
  accentEmpty,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  meta?: string;
  accentEmpty?: boolean; // make the row red-tinted when empty
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
          open ? 'bg-gray-50' : accentEmpty ? 'hover:bg-gray-50' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}
          {label}
          {meta && <span className="text-xs font-normal text-gray-400 ml-1">{meta}</span>}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Sessions grouped by teacher ──────────────────────────────────────────────

function SessionsSection({ sessions }: { sessions: SessionScore[] }) {
  // Total score across all sessions
  const totalScore = sessions.reduce((s, r) => s + r.score, 0);
  const totalMax   = sessions.reduce((s, r) => s + r.maxScore, 0);
  const totalPct   = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  // Group by teacher
  const byTeacher = useMemo(() => {
    const map: Record<string, SessionScore[]> = {};
    for (const s of sessions) {
      if (!map[s.teacherName]) map[s.teacherName] = [];
      map[s.teacherName].push(s);
    }
    return Object.entries(map);
  }, [sessions]);

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-400 py-2 text-center">No session records yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Overall score summary */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-bold text-gray-800">Total Score</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                totalPct >= 90 ? 'bg-emerald-500' : totalPct >= 70 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <span className="text-sm font-bold text-primary-700">
            {totalScore}/{totalMax}
            <span className="text-xs text-gray-500 ml-1">({totalPct}%)</span>
          </span>
        </div>
      </div>

      {/* Per-teacher groups */}
      {byTeacher.map(([teacherName, sArr]) => {
        const tScore = sArr.reduce((a, s) => a + s.score, 0);
        const tMax   = sArr.reduce((a, s) => a + s.maxScore, 0);
        return (
          <div key={teacherName} className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{teacherName}</p>
              <span className="text-xs text-gray-400 ml-auto">{tScore}/{tMax}</span>
            </div>
            <div className="space-y-2 pl-2 border-l-2 border-indigo-100">
              {sArr.map((s) => (
                <div key={s.id} className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{s.surah}</p>
                      <p className="text-xs text-gray-400">{format(new Date(s.date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${
                        s.score / s.maxScore >= 0.9 ? 'text-emerald-600'
                        : s.score / s.maxScore >= 0.7 ? 'text-amber-600'
                        : 'text-red-600'
                      }`}>{s.score}</span>
                      <span className="text-xs text-gray-400">/{s.maxScore}</span>
                    </div>
                  </div>
                  <ScoreBar score={s.score} max={s.maxScore} />
                  {s.teacherComment && (
                    <div className="flex items-start gap-1.5 pt-1 border-t border-dashed border-gray-200">
                      <MessageSquare className="h-3.5 w-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 italic">"{s.teacherComment}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Student Card ─────────────────────────────────────────────────────────────

function StudentCard({ student }: { student: StudentSubscription }) {
  const hasComplaints  = student.complaints.length > 0;
  const openComplaints = student.complaints.filter((c) => !c.resolved).length;
  const hasHistory     = student.teacherHistory.length > 0;
  const barColor       = STATUS_CFG[student.status].bar;

  // Total score aggregate for quick display in header
  const totalScore = student.sessions.reduce((a, s) => a + s.score, 0);
  const totalMax   = student.sessions.reduce((a, s) => a + s.maxScore, 0);
  const totalPct   = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${barColor} shadow-sm overflow-hidden hover:shadow-md transition-shadow`}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-gray-900">{student.studentName}</h3>
            <StatusBadge status={student.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {student.phone}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> Age {student.age}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Subscribed {format(new Date(student.joinDate), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        {/* Score pill in top-right */}
        {totalPct !== null && (
          <div className="flex-shrink-0 flex flex-col items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <Star className="h-3.5 w-3.5 text-amber-400 mb-0.5" />
            <span className="text-sm font-bold text-gray-800">{totalPct}%</span>
            <span className="text-xs text-gray-400">{student.sessions.length} sessions</span>
          </div>
        )}
      </div>

      {/* ── Subscription info strip ──────────────────────────────────────── */}
      <div className="mx-4 mb-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="font-semibold text-gray-700">Current subscription:</span>
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3 text-gray-400" /> {student.teacherName}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-gray-400" />
          since {format(new Date(student.joinDate), 'MMM yyyy')}
        </span>
      </div>

      {/* ── Complaints accordion (always shown) ─────────────────────────── */}
      <Accordion
        icon={
          <AlertCircle
            className={`h-4 w-4 ${hasComplaints ? 'text-red-500' : 'text-gray-400'}`}
          />
        }
        label="Complaints"
        meta={
          hasComplaints
            ? `${student.complaints.length} total · ${openComplaints} open`
            : 'none'
        }
      >
        {!hasComplaints ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <CheckCircle className="h-4 w-4" /> No complaints filed for this student.
          </div>
        ) : (
          <div className="space-y-2">
            {student.complaints.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3"
              >
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{c.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-500">
                      {format(new Date(c.date), 'MMM d, yyyy')}
                    </span>
                    {c.resolved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
                        <XCircle className="h-3 w-3" /> Open
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Accordion>

      {/* ── Teacher accordion ────────────────────────────────────────────── */}
      <Accordion
        icon={<BookOpen className="h-4 w-4 text-indigo-500" />}
        label="Teacher"
        meta={hasHistory ? `current + ${student.teacherHistory.length} previous` : 'current only'}
      >
        <div className="space-y-3">
          {/* Current teacher */}
          <div className="flex items-center gap-3 bg-primary-50 border border-primary-100 rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-4 w-4 text-primary-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary-900">{student.teacherName}</p>
              <p className="text-xs text-primary-600">
                Age {student.teacherAge} · Current teacher · since {format(new Date(student.joinDate), 'MMM yyyy')}
              </p>
            </div>
            <span className="ml-auto text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>

          {/* History */}
          {hasHistory && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <History className="h-3.5 w-3.5" /> Previous Teachers
              </p>
              <ol className="relative border-l-2 border-indigo-100 ml-3 space-y-3">
                {student.teacherHistory.map((h, i) => (
                  <li key={i} className="ml-4 relative">
                    <span className="absolute -left-[21px] top-2 w-4 h-4 bg-indigo-100 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    </span>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <p className="text-sm font-semibold text-gray-900">{h.teacherName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(h.from), 'MMM yyyy')} – {format(new Date(h.to), 'MMM yyyy')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 italic">Reason: {h.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </Accordion>

      {/* ── Scores accordion ─────────────────────────────────────────────── */}
      <Accordion
        icon={<Star className="h-4 w-4 text-amber-400" />}
        label="Session Scores"
        meta={
          student.sessions.length > 0
            ? `${student.sessions.length} sessions · ${totalPct}% avg`
            : 'no sessions'
        }
      >
        <SessionsSection sessions={student.sessions} />
      </Accordion>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StudentsPage() {
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<SubscriptionStatus | ''>('');
  const [teacherFilter, setTeacher] = useState('');

  const teacherNames = useMemo(
    () => Array.from(new Set(mockStudentSubscriptions.map((s) => s.teacherName))).sort(),
    []
  );

  const filtered = useMemo(() => {
    let list = mockStudentSubscriptions;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.studentName.toLowerCase().includes(q) || s.phone.includes(q)
      );
    }
    if (statusFilter)  list = list.filter((s) => s.status === statusFilter);
    if (teacherFilter) list = list.filter((s) => s.teacherName === teacherFilter);
    return list;
  }, [search, statusFilter, teacherFilter]);

  const total     = mockStudentSubscriptions.length;
  const active    = mockStudentSubscriptions.filter((s) => s.status === 'active').length;
  const paused    = mockStudentSubscriptions.filter((s) => s.status === 'paused').length;
  const withdrawn = mockStudentSubscriptions.filter((s) => s.status === 'withdrawn').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Full profiles — subscription status, complaints, teacher history and session scores.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: total,     icon: GraduationCap, bg: 'bg-primary-50', text: 'text-primary-700', iconBg: 'bg-primary-100' },
          { label: 'Active',    value: active,    icon: CheckCircle,   bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
          { label: 'Paused',    value: paused,    icon: PauseCircle,   bg: 'bg-amber-50',   text: 'text-amber-700',   iconBg: 'bg-amber-100' },
          { label: 'Withdrawn', value: withdrawn, icon: XCircle,       bg: 'bg-red-50',     text: 'text-red-700',     iconBg: 'bg-red-100' },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value as SubscriptionStatus | '')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-400 focus:border-primary-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <select
          value={teacherFilter}
          onChange={(e) => setTeacher(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-400 focus:border-primary-400 min-w-[210px]"
        >
          <option value="">All Teachers</option>
          {teacherNames.map((tn) => (
            <option key={tn} value={tn}>{tn}</option>
          ))}
        </select>
      </div>

      {/* Card list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          No students match the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentsPage;
