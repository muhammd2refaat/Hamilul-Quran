/**
 * Attendance page — who actually clicked "Join" for each scheduled
 * session, student and teacher side by side. Reads from Zustand store,
 * backed by GET /sessions/attendance (ADMIN only).
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Video,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Calendar,
  User,
  GraduationCap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useAttendanceStore } from '../store/attendanceStore';
import type { AttendanceRecord } from '../types';

type Completeness = 'both' | 'teacher_only' | 'student_only';

function completenessOf(r: AttendanceRecord): Completeness {
  if (r.studentJoinedAt && r.teacherJoinedAt) return 'both';
  if (r.teacherJoinedAt) return 'teacher_only';
  return 'student_only';
}

const COMPLETENESS_CFG: Record<Completeness, { cls: string; icon: React.ElementType }> = {
  both: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  teacher_only: { cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
  student_only: { cls: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

function AttendanceBadge({ record }: { record: AttendanceRecord }) {
  const { t } = useTranslation();
  const completeness = completenessOf(record);
  const { cls, icon: Icon } = COMPLETENESS_CFG[completeness];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {t(`attendance.completeness.${completeness}`)}
    </span>
  );
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
            <Calendar className="h-3 w-3" />
            {format(new Date(record.sessionDate), 'MMM d, yyyy')} · {record.scheduledTime}
          </span>
          <AttendanceBadge record={record} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-primary-600" />
            <span className="font-semibold text-gray-900">{record.teacherName}</span>
            <span className={record.teacherJoinedAt ? 'text-emerald-600 text-xs' : 'text-gray-400 text-xs'}>
              {record.teacherJoinedAt
                ? `${t('attendance.joinedAt')} ${format(new Date(record.teacherJoinedAt), 'p')}`
                : t('attendance.didNotJoin')}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary-600" />
            <span className="font-semibold text-gray-900">{record.studentName}</span>
            <span className={record.studentJoinedAt ? 'text-emerald-600 text-xs' : 'text-gray-400 text-xs'}>
              {record.studentJoinedAt
                ? `${t('attendance.joinedAt')} ${format(new Date(record.studentJoinedAt), 'p')}`
                : t('attendance.didNotJoin')}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function AttendancePage() {
  const { t } = useTranslation();
  const { records, fetchAttendance, isLoading } = useAttendanceStore();
  const [search, setSearch] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState<Completeness | ''>('');

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const stats = useMemo(() => {
    const both = records.filter((r) => completenessOf(r) === 'both').length;
    const teacherOnly = records.filter((r) => completenessOf(r) === 'teacher_only').length;
    const studentOnly = records.filter((r) => completenessOf(r) === 'student_only').length;
    return { total: records.length, both, teacherOnly, studentOnly };
  }, [records]);

  const filtered = useMemo(() => {
    let list = records;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.studentName.toLowerCase().includes(q) || r.teacherName.toLowerCase().includes(q)
      );
    }
    if (completenessFilter) {
      list = list.filter((r) => completenessOf(r) === completenessFilter);
    }
    return [...list].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  }, [records, search, completenessFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('attendance.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('attendance.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('attendance.total'), value: stats.total, cls: 'bg-gray-50 text-gray-700', iconBg: 'bg-gray-200', icon: Video },
          { label: t('attendance.completeness.both'), value: stats.both, cls: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100', icon: CheckCircle2 },
          { label: t('attendance.completeness.teacher_only'), value: stats.teacherOnly, cls: 'bg-amber-50 text-amber-700', iconBg: 'bg-amber-100', icon: AlertTriangle },
          { label: t('attendance.completeness.student_only'), value: stats.studentOnly, cls: 'bg-red-50 text-red-700', iconBg: 'bg-red-100', icon: XCircle },
        ].map(({ label, value, cls, iconBg, icon: Icon }) => (
          <div key={label} className={`${cls} rounded-xl border border-gray-200 p-3 flex items-center gap-3`}>
            <div className={`${iconBg} rounded-xl p-2`}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-extrabold">{value}</p>
              <p className="text-xs font-medium opacity-70">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('attendance.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 pe-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <select
          value={completenessFilter}
          onChange={(e) => setCompletenessFilter(e.target.value as Completeness | '')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">{t('attendance.allStatuses')}</option>
          <option value="both">{t('attendance.completeness.both')}</option>
          <option value="teacher_only">{t('attendance.completeness.teacher_only')}</option>
          <option value="student_only">{t('attendance.completeness.student_only')}</option>
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          {t('attendance.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          <Filter className="h-10 w-10 mx-auto mb-3 opacity-40" />
          {t('attendance.noMatch')}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <AttendanceRow key={`${r.allocationId}-${r.sessionDate}`} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AttendancePage;
