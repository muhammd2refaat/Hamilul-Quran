/**
 * Dashboard — real platform metrics from GET /dashboard/metrics, including
 * session-score, attendance, and subscription aggregates. Subscription
 * figures are counts by status/plan — there's no price field anywhere in
 * the schema, so this deliberately doesn't show a $ revenue number (see
 * DashboardService in the backend for the full reasoning).
 */

import { useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  ShieldCheck,
  CheckCircle,
  Clock,
  Globe2,
  ClipboardList,
  Calendar,
  AlertCircle,
  Activity,
  Loader2,
  Award,
  Video,
  Trophy,
  CreditCard,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../store/dashboardStore';
import { format, parseISO } from 'date-fns';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-primary-100 rounded-xl p-2">
        <Icon className="h-5 w-5 text-primary-600" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {desc && <p className="text-xs text-gray-500">{desc}</p>}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => (
          <p key={p.name} style={{ color: p.color ?? p.fill }} className="font-medium">
            {p.name}: {p.value}
          </p>
        )
      )}
    </div>
  );
}

const COLORS = {
  active: '#10b981',
  inactive: '#9ca3af',
  suspended: '#ef4444',
  pending: '#f59e0b',
  primary: '#6366f1',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: COLORS.active,
  INACTIVE: COLORS.inactive,
  SUSPENDED: COLORS.suspended,
  PENDING: COLORS.pending,
};

const MONTH_OPTIONS = [3, 6, 12, 24];

const PLAN_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'];

export function DashboardPage() {
  const { t } = useTranslation();
  const { metrics, isLoading, error, months, setMonths, fetchDashboardData } = useDashboardStore();

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin me-2" /> {t('dashboard.loading')}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-red-500">
        {error || t('dashboard.loadError')}
      </div>
    );
  }

  const statusPie = Object.entries(metrics.usersByStatus).map(([status, count]) => ({
    name: status.charAt(0) + status.slice(1).toLowerCase(),
    value: count,
    fill: STATUS_COLORS[status] ?? '#9ca3af',
  }));

  const complaintBar = Object.entries(metrics.complaintsByStatus).map(([status, count]) => ({
    label: status.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()),
    value: count,
  }));

  const subsStatusPie = Object.entries(metrics.subscriptionsByStatus).map(([status, count]) => ({
    name: status.charAt(0) + status.slice(1).toLowerCase(),
    value: count,
    fill: STATUS_COLORS[status.toUpperCase()] ?? '#9ca3af',
  }));

  const subsPlanBar = Object.entries(metrics.subscriptionsByPlan)
    .sort((a, b) => b[1] - a[1])
    .map(([plan, count], i) => ({ label: plan, value: count, fill: PLAN_COLORS[i % PLAN_COLORS.length] }));

  const teacherLeaderboardBar = metrics.topTeachersByScore.map((row) => ({
    label: row.teacherName,
    value: row.avgPct,
    sessions: row.sessionCount,
  }));

  return (
    <div className="space-y-8 pb-8">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  m === months ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('dashboard.monthsRange', { count: m })}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1">
            <Activity className="h-3 w-3" /> {t('dashboard.liveData')}
          </span>
        </div>
      </div>

      {/* ── KPI stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label={t('dashboard.totalUsers')} value={metrics.totalUsers} icon={Activity} color="bg-primary-100 text-primary-700" />
        <StatCard label={t('dashboard.students')} value={metrics.totalStudents} icon={GraduationCap} color="bg-indigo-100 text-indigo-700" />
        <StatCard label={t('dashboard.teachers')} value={metrics.totalTeachers} icon={BookOpen} color="bg-violet-100 text-violet-700" />
        <StatCard label={t('dashboard.admins')} value={metrics.totalAdmins} icon={ShieldCheck} color="bg-slate-100 text-slate-700" />
        <StatCard label={t('dashboard.allocations')} value={metrics.totalAllocations} icon={ClipboardList} color="bg-emerald-100 text-emerald-700" />
        <StatCard label={t('dashboard.countries')} value={metrics.totalCountries} icon={Globe2} color="bg-amber-100 text-amber-700" />
      </div>

      {/* ── KPI stat cards: scores + attendance ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <StatCard
          label={t('dashboard.avgSessionScore')}
          value={metrics.avgSessionScorePct != null ? `${metrics.avgSessionScorePct}%` : '—'}
          sub={t('dashboard.avgSessionScoreSub')}
          icon={Award}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label={t('dashboard.attendanceRate')}
          value={metrics.attendanceBothJoinedRatePct != null ? `${metrics.attendanceBothJoinedRatePct}%` : '—'}
          sub={t('dashboard.attendanceRateSub')}
          icon={Video}
          color="bg-sky-100 text-sky-700"
        />
      </div>

      {/* ── Row 1: Status pie + Signups by month ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={CheckCircle} title={t('dashboard.usersByStatus')} desc={t('dashboard.usersByStatusDesc')} />
          {statusPie.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('dashboard.noUsers')}</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-5 mt-2 flex-wrap">
                {statusPie.map((e) => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <span className="w-3 h-3 rounded-full" style={{ background: e.fill }} />
                    {e.name} ({e.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Calendar} title={t('dashboard.signupsByMonth')} desc={t('dashboard.signupsByMonthDesc')} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics.signupsByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name={t('dashboard.signups')} fill={COLORS.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2: Complaints + Recent signups ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={AlertCircle} title={t('dashboard.complaintsByStatus')} desc={t('dashboard.complaintsByStatusDesc')} />
          {complaintBar.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <CheckCircle className="h-4 w-4" /> {t('dashboard.noComplaints')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complaintBar} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={90} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name={t('dashboard.count')} fill={COLORS.primary} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Clock} title={t('dashboard.recentSignups')} desc={t('dashboard.recentSignupsDesc')} />
          {metrics.recentSignups.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('dashboard.noSignups')}</p>
          ) : (
            <div className="space-y-2">
              {metrics.recentSignups.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.fullName || s.email}</p>
                    <p className="text-xs text-gray-500 truncate">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-medium text-gray-500">{s.role}</span>
                    <span className="text-xs text-gray-400">{format(parseISO(s.createdAt), 'MMM d')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Score trend + Top teachers by score ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Award} title={t('dashboard.scoreTrend')} desc={t('dashboard.scoreTrendDesc')} />
          {metrics.scoreTrendByMonth.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('dashboard.noScores')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.scoreTrendByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="avgPct" name={t('dashboard.avgScore')} fill={COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Trophy} title={t('dashboard.topTeachers')} desc={t('dashboard.topTeachersDesc')} />
          {teacherLeaderboardBar.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('dashboard.noScores')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={teacherLeaderboardBar} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={110} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name={t('dashboard.avgScore')} fill={COLORS.active} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 4: Subscriptions by status + by plan ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={CreditCard} title={t('dashboard.subsByStatus')} desc={t('dashboard.subsByStatusDesc')} />
          {subsStatusPie.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('dashboard.noSubscriptions')}</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={subsStatusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {subsStatusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-5 mt-2 flex-wrap">
                {subsStatusPie.map((e) => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <span className="w-3 h-3 rounded-full" style={{ background: e.fill }} />
                    {e.name} ({e.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={ClipboardList} title={t('dashboard.subsByPlan')} desc={t('dashboard.subsByPlanDesc')} />
          {subsPlanBar.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('dashboard.noSubscriptions')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subsPlanBar} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={140} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name={t('dashboard.count')} radius={[0, 6, 6, 0]}>
                  {subsPlanBar.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
