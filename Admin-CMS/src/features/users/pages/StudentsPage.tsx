/**
 * StudentsPage — real backend data (role=STUDENT)
 * Keeps all rich attributes from mock design, sourced from backend.
 * Features without a backend table (complaints, teacher history, session scores)
 * are shown with a pending placeholder per the gap analysis.
 */

import { useEffect, useState } from 'react';
import {
  GraduationCap,
  Search,
  CheckCircle,
  XCircle,
  PauseCircle,
  Mail,
  Phone,
  MapPin,
  Users,
  RefreshCw,
  BookOpen,
  CalendarDays,
  User,
  AlertCircle,
  Star,
  Plus,
} from 'lucide-react';
import { useUsersStore, selectUsers, selectIsLoading } from '../store/usersStore';
import { ComplaintsTable, TeacherHistoryTable, SessionScoresTable } from '../components/UserSubTables';
import { AddUserModal } from '../components/AddUserModal';
import { UserActions } from '../components/UserActions';
import type { User as UserType } from '../store/usersStore';
import { format, differenceInYears, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; badge: string; bar: string; icon: React.ElementType }> = {
  ACTIVE:    { label: 'Active',    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'border-l-emerald-500', icon: CheckCircle },
  active:    { label: 'Active',    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'border-l-emerald-500', icon: CheckCircle },
  INACTIVE:  { label: 'Inactive',  badge: 'bg-gray-100 text-gray-600 border-gray-200',          bar: 'border-l-gray-400',    icon: XCircle },
  inactive:  { label: 'Inactive',  badge: 'bg-gray-100 text-gray-600 border-gray-200',          bar: 'border-l-gray-400',    icon: XCircle },
  SUSPENDED: { label: 'Suspended', badge: 'bg-red-100 text-red-700 border-red-200',             bar: 'border-l-red-400',     icon: XCircle },
  suspended: { label: 'Suspended', badge: 'bg-red-100 text-red-700 border-red-200',             bar: 'border-l-red-400',     icon: XCircle },
  PENDING:   { label: 'Pending',   badge: 'bg-amber-100 text-amber-700 border-amber-200',       bar: 'border-l-amber-400',   icon: PauseCircle },
  pending:   { label: 'Pending',   badge: 'bg-amber-100 text-amber-700 border-amber-200',       bar: 'border-l-amber-400',   icon: PauseCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, badge: 'bg-gray-100 text-gray-600 border-gray-200', bar: 'border-l-gray-400', icon: PauseCircle };
  const { label, badge, icon: Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

// ─── Student Card ─────────────────────────────────────────────────────────────

function StudentCard({ student, teacherName }: { student: UserType; teacherName?: string }) {
  const { t } = useTranslation();
  const allUsers = useUsersStore(selectUsers);
  const resolveTeacherName = (id: string) => {
    const u = allUsers.find((usr) => usr.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };

  const fullName = `${student.firstName} ${student.lastName}`;
  const initials = `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
  const age = student.dateOfBirth
    ? differenceInYears(new Date(), parseISO(student.dateOfBirth))
    : null;
  const barColor = (STATUS_MAP[student.status] ?? STATUS_MAP.PENDING).bar;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${barColor} shadow-sm overflow-hidden hover:shadow-md transition-shadow`}>
      {/* ── Header ── */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-gray-900">{fullName}</h3>
            <StatusBadge status={student.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {student.email}</span>
            {student.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {student.phone}</span>}
            {age !== null && <span className="flex items-center gap-1"><User className="h-3 w-3" /> Age {age}</span>}
            {(student.city || student.country) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {[student.city, student.country].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
  {student.username && (
            <p className="text-xs text-gray-400 mt-0.5">@{student.username}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <UserActions user={student} />
        </div>
      </div>

      {/* ── Subscription info strip (current teacher from backend) ── */}
      <div className="mx-4 mb-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="font-semibold text-gray-700">{t('users.currentTeacher')}</span>
        {teacherName ? (
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3 text-gray-400" /> {teacherName}</span>
        ) : (
          <span className="text-gray-400 italic">{t('users.notAssigned')}</span>
        )}
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3 text-gray-400" />
          {t('users.joined', { date: format(new Date(student.joinedDate || student.createdAt), 'MMM yyyy') })}
        </span>
      </div>

      {/* ── Complaints ── */}
      <div className="px-4 pb-3 border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <AlertCircle className="h-3.5 w-3.5" /> Complaints
        </p>
        <ComplaintsTable userId={student.id} />
      </div>

      {/* ── Teacher history ── */}
      <div className="px-4 pb-3 border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <BookOpen className="h-3.5 w-3.5" /> Teacher History
        </p>
        <TeacherHistoryTable studentId={student.id} resolveTeacherName={resolveTeacherName} />
      </div>

      {/* ── Session scores ── */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <Star className="h-3.5 w-3.5" /> Session Scores
        </p>
        <SessionScoresTable studentId={student.id} resolveTeacherName={resolveTeacherName} />
      </div>

      {/* ── Footer ── */}
      <div className="px-4 pb-3 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-2">
        <span>Created {format(new Date(student.createdAt), 'MMM d, yyyy')}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StudentsPage() {
  const { t } = useTranslation();
  const allUsers = useUsersStore(selectUsers);
  const isLoading = useUsersStore(selectIsLoading);
  const { fetchUsers, setFilters, filters } = useUsersStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    setFilters({ search, status: statusFilter as any } as any);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(t);
  }, [filters]);

  const teachers = allUsers.filter(u => u.role === 'TEACHER');
  const students = allUsers.filter(u => u.role === 'STUDENT');

  // Build teacher lookup map by id for resolving teacher names
  const teacherById: Record<string, UserType> = {};
  teachers.forEach(t => { teacherById[t.id] = t; });

  const active    = students.filter(s => s.status === 'ACTIVE' || s.status === 'active').length;
  const inactive  = students.filter(s => s.status === 'INACTIVE' || s.status === 'inactive').length;
  const suspended = students.filter(s => s.status === 'SUSPENDED' || s.status === 'suspended').length;

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${s.firstName} ${s.lastName} ${s.email} ${s.username}`.toLowerCase().includes(q);
    const matchStatus = !statusFilter || s.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.studentsTitle')}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {t('users.studentsLiveData', { count: students.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('users.addStudent')}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('common.total'),     value: students.length, icon: GraduationCap, bg: 'bg-primary-50',  text: 'text-primary-700',  iconBg: 'bg-primary-100' },
          { label: t('status.active'),    value: active,          icon: CheckCircle,   bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
          { label: t('status.inactive'),  value: inactive,        icon: XCircle,       bg: 'bg-gray-50',    text: 'text-gray-600',   iconBg: 'bg-gray-100' },
          { label: t('status.suspended'), value: suspended,       icon: Users,         bg: 'bg-red-50',     text: 'text-red-700',    iconBg: 'bg-red-100' },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('users.searchNameEmailUsername')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 pe-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-400 focus:border-primary-400"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="ACTIVE">{t('status.active')}</option>
          <option value="INACTIVE">{t('status.inactive')}</option>
          <option value="SUSPENDED">{t('status.suspended')}</option>
          <option value="PENDING">{t('status.pending')}</option>
        </select>
      </div>

      {/* Card list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading students…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          No students match the selected filters.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(s => {
            const teacher = s.teacherId ? teacherById[s.teacherId] : undefined;
            const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : undefined;
            return <StudentCard key={s.id} student={s} teacherName={teacherName} />;
          })}
        </div>
      )}

      <AddUserModal role="STUDENT" isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}

export default StudentsPage;
