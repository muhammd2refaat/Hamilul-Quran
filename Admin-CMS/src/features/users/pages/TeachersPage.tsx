/**
 * TeachersPage — real backend data (role=TEACHER)
 * Keeps all rich attributes from mock data design while sourcing from backend.
 * Fields that don't exist in backend yet (qualifications, reviews, sessions)
 * are shown as "not yet available" placeholder — backend tables are documented
 * in the gap analysis for future implementation.
 */

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle,
  XCircle,
  PauseCircle,
  Mail,
  Phone,
  MapPin,
  Users,
  GraduationCap,
  RefreshCw,
  Trophy,
  Award,
  CalendarDays,
  User,
} from 'lucide-react';
import { useUsersStore, selectUsers, selectIsLoading } from '../store/usersStore';
import type { User as UserType } from '../store/usersStore';
import { format, differenceInYears, parseISO } from 'date-fns';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  ACTIVE:    { label: 'Active',    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  active:    { label: 'Active',    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  INACTIVE:  { label: 'Inactive',  badge: 'bg-gray-100 text-gray-600 border-gray-200',          icon: XCircle },
  inactive:  { label: 'Inactive',  badge: 'bg-gray-100 text-gray-600 border-gray-200',          icon: XCircle },
  SUSPENDED: { label: 'Suspended', badge: 'bg-red-100 text-red-700 border-red-200',             icon: XCircle },
  suspended: { label: 'Suspended', badge: 'bg-red-100 text-red-700 border-red-200',             icon: XCircle },
  PENDING:   { label: 'Pending',   badge: 'bg-amber-100 text-amber-700 border-amber-200',       icon: PauseCircle },
  pending:   { label: 'Pending',   badge: 'bg-amber-100 text-amber-700 border-amber-200',       icon: PauseCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, badge: 'bg-gray-100 text-gray-600', icon: PauseCircle };
  const { label, badge, icon: Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

// ─── Pending implementation note ──────────────────────────────────────────────

function PendingFeature({ label }: { label: string }) {
  return (
    <div className="text-xs text-gray-400 italic py-2 px-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
      ⏳ {label} — backend table not yet implemented
    </div>
  );
}

// ─── Student Mini Row ─────────────────────────────────────────────────────────

function StudentMiniRow({ student }: { student: UserType }) {
  const fullName = `${student.firstName} ${student.lastName}`;
  const age = student.dateOfBirth
    ? differenceInYears(new Date(), parseISO(student.dateOfBirth))
    : null;
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
        <GraduationCap className="h-4 w-4 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
        <p className="text-xs text-gray-500 flex items-center gap-2">
          {student.email}
          {age && <span>· Age {age}</span>}
          {student.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{student.phone}</span>}
        </p>
      </div>
      <StatusBadge status={student.status} />
    </div>
  );
}

// ─── Teacher Card ─────────────────────────────────────────────────────────────

function TeacherCard({ teacher, assignedStudents }: { teacher: UserType; assignedStudents: UserType[] }) {
  const fullName = `${teacher.firstName} ${teacher.lastName}`;
  const initials = `${teacher.firstName[0] ?? ''}${teacher.lastName[0] ?? ''}`.toUpperCase();
  const age = teacher.dateOfBirth
    ? differenceInYears(new Date(), parseISO(teacher.dateOfBirth))
    : null;
  const [showStudents, setShowStudents] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 bg-gradient-to-r from-primary-700 to-primary-900">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">{initials}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{fullName}</h2>
            <p className="text-primary-200 text-sm mt-0.5">
              {age ? `Age ${age}` : teacher.username ? `@${teacher.username}` : 'Teacher'}
            </p>
            <div className="mt-1"><StatusBadge status={teacher.status} /></div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2 text-white">
            <GraduationCap className="h-4 w-4 text-primary-200" />
            <span className="text-sm font-semibold">{assignedStudents.length}</span>
            <span className="text-xs text-primary-300 hidden sm:inline">Students</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2 text-white">
            <Trophy className="h-4 w-4 text-primary-200" />
            <span className="text-sm font-semibold">{teacher.points}</span>
            <span className="text-xs text-primary-300 hidden sm:inline">Points</span>
          </div>
        </div>
      </div>

      {/* ── Contact & Info ── */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{teacher.email}</span>
          </div>
          {teacher.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>{teacher.phone}</span>
            </div>
          )}
          {(teacher.city || teacher.country) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>{[teacher.city, teacher.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span>Joined {format(new Date(teacher.joinedDate || teacher.createdAt), 'MMM d, yyyy')}</span>
          </div>
          {teacher.username && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>@{teacher.username}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Qualifications — backend table pending ── */}
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <Award className="h-3.5 w-3.5" /> Qualifications
        </p>
        <PendingFeature label="Qualifications/certifications" />
      </div>

      {/* ── Reviews — backend table pending ── */}
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          ⭐ Reviews
        </p>
        <PendingFeature label="Teacher reviews & ratings" />
      </div>

      {/* ── Assigned Students (real backend data via teacher_id) ── */}
      <div className="px-5 py-3">
        <button
          onClick={() => setShowStudents(s => !s)}
          className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 hover:text-primary-700 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Students ({assignedStudents.length} enrolled)
          </span>
          <span className="text-xs normal-case font-normal text-primary-600">
            {showStudents ? 'Hide' : 'Show'}
          </span>
        </button>
        {showStudents && (
          assignedStudents.length === 0 ? (
            <p className="text-sm text-gray-400 py-2 text-center">No students currently assigned.</p>
          ) : (
            <div className="space-y-2">
              {assignedStudents.map(s => <StudentMiniRow key={s.id} student={s} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TeachersPage() {
  const allUsers = useUsersStore(selectUsers);
  const isLoading = useUsersStore(selectIsLoading);
  const { fetchUsers, setFilters, filters } = useUsersStore();

  const [search, setSearch] = useState('');

  useEffect(() => {
    setFilters({ search } as any);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(t);
  }, [filters]);

  const teachers = allUsers.filter(u => u.role === 'TEACHER');
  const students = allUsers.filter(u => u.role === 'STUDENT');

  // Group students by their assigned teacher (uses backend teacher_id field)
  const studentsByTeacherId: Record<string, UserType[]> = {};
  students.forEach(s => {
    if (s.teacherId) {
      if (!studentsByTeacherId[s.teacherId]) studentsByTeacherId[s.teacherId] = [];
      studentsByTeacherId[s.teacherId].push(s);
    }
  });

  const filtered = teachers.filter(t => {
    const q = search.toLowerCase();
    return !q || `${t.firstName} ${t.lastName} ${t.email} ${t.username}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {teachers.length} teachers · {students.length} students · live data from backend
          </p>
        </div>
        <button
          onClick={() => fetchUsers()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Teachers',       value: teachers.length, icon: BookOpen,      bg: 'bg-primary-50',  text: 'text-primary-700',  iconBg: 'bg-primary-100' },
          { label: 'Total Students', value: students.length, icon: Users,         bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
          { label: 'Active',         value: teachers.filter(t => t.status === 'ACTIVE' || t.status === 'active').length, icon: CheckCircle, bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
        ].map(({ label, value, icon: Icon, bg, text, iconBg }) => (
          <div key={label} className={`${bg} ${text} rounded-xl border border-gray-200 p-4 flex items-center gap-3`}>
            <div className={`${iconBg} rounded-xl p-2.5`}><Icon className="h-6 w-6" /></div>
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
          placeholder="Search by name, email or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      {/* Teacher list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading teachers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          No teachers match your search.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => (
            <TeacherCard
              key={t.id}
              teacher={t}
              assignedStudents={studentsByTeacherId[t.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TeachersPage;
