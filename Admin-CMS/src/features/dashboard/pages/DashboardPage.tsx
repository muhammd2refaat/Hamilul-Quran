/**
 * Dashboard — Quran platform analytics derived from live subscription data
 */

import { useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertCircle,
  TrendingUp,
  Star,
  Users,
  Calendar,
  MessageSquare,
  Activity,
  Award,
  ClipboardList,
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
  LineChart,
  Line,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from 'recharts';
import { mockStudentSubscriptions, mockTeacherSubscriptions } from '@/mock-data/subscriptions';
import { format } from 'date-fns';

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
  color: string; // tailwind bg + text classes
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
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

// ─── Section heading ──────────────────────────────────────────────────────────

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

// ─── Tooltip wrapper ──────────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

const COLORS = {
  active:    '#10b981',
  paused:    '#f59e0b',
  withdrawn: '#ef4444',
  primary:   '#6366f1',
  blue:      '#3b82f6',
  violet:    '#8b5cf6',
  rose:      '#f43f5e',
};

export function DashboardPage() {
  const students  = mockStudentSubscriptions;
  const teachers  = mockTeacherSubscriptions;

  // ── Core counts ─────────────────────────────────────────────────────────────
  const activeCount    = students.filter((s) => s.status === 'active').length;
  const pausedCount    = students.filter((s) => s.status === 'paused').length;
  const withdrawnCount = students.filter((s) => s.status === 'withdrawn').length;
  const totalStudents  = students.length;
  const teacherCount   = teachers.length;
  const totalSessions  = teachers.reduce((a, t) => a + t.sessionCount, 0);

  // Total subscriptions ever joined (students who have a joinDate = all of them)
  const joinedSubs = totalStudents;

  // Total complaints
  const allComplaints  = students.flatMap((s) => s.complaints);
  const openComplaints = allComplaints.filter((c) => !c.resolved).length;

  // ── Subscription status pie ──────────────────────────────────────────────────
  const statusPie = [
    { name: 'Active',    value: activeCount,    fill: COLORS.active },
    { name: 'Paused',    value: pausedCount,    fill: COLORS.paused },
    { name: 'Withdrawn', value: withdrawnCount, fill: COLORS.withdrawn },
  ];

  // ── Paused-with-reason breakdown ─────────────────────────────────────────────
  const pausedStudents = students.filter((s) => s.status === 'paused');

  // ── Students per teacher ──────────────────────────────────────────────────────
  const studentsPerTeacher = teachers.map((t) => ({
    name: t.teacherName.split(' ').slice(-1)[0], // short name
    fullName: t.teacherName,
    students: t.studentCount,
    sessions: t.sessionCount,
    avgRating:
      t.reviews.length > 0
        ? parseFloat((t.reviews.reduce((a, r) => a + r.rating, 0) / t.reviews.length).toFixed(1))
        : 0,
  }));

  // ── Avg score per teacher ─────────────────────────────────────────────────────
  const scoresByTeacher = useMemo(() => {
    const map: Record<string, { total: number; max: number; count: number }> = {};
    for (const s of students) {
      for (const sess of s.sessions) {
        if (!map[sess.teacherName]) map[sess.teacherName] = { total: 0, max: 0, count: 0 };
        map[sess.teacherName].total += sess.score;
        map[sess.teacherName].max   += sess.maxScore;
        map[sess.teacherName].count += 1;
      }
    }
    return Object.entries(map).map(([name, v]) => ({
      name: name.split(' ').slice(-1)[0],
      fullName: name,
      avgPct: Math.round((v.total / v.max) * 100),
      sessions: v.count,
    }));
  }, [students]);

  // ── Monthly subscriptions joined (by joinDate month) ─────────────────────────
  const monthlyJoins = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) {
      const key = format(new Date(s.joinDate), 'MMM yy');
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => new Date('01 ' + a).getTime() - new Date('01 ' + b).getTime())
      .map(([month, count]) => ({ month, count }));
  }, [students]);

  // ── Teacher rating radar ──────────────────────────────────────────────────────
  const radarData = teachers.map((t) => {
    const avgRating =
      t.reviews.length > 0
        ? t.reviews.reduce((a, r) => a + r.rating, 0) / t.reviews.length
        : 0;
    const adminRating =
      t.reviews.filter((r) => r.isAdmin).reduce((a, r) => a + r.rating, 0) /
        (t.reviews.filter((r) => r.isAdmin).length || 1);
    const studentRating =
      t.reviews.filter((r) => !r.isAdmin).reduce((a, r) => a + r.rating, 0) /
        (t.reviews.filter((r) => !r.isAdmin).length || 1);
    return {
      teacher: t.teacherName.split(' ').slice(-1)[0],
      Overall: parseFloat(avgRating.toFixed(1)),
      Admin: parseFloat(adminRating.toFixed(1)),
      Students: parseFloat(studentRating.toFixed(1)),
    };
  });

  // ── Complaint open/resolved ───────────────────────────────────────────────────
  const complaintBar = [
    { label: 'Open',     value: openComplaints,                          fill: COLORS.withdrawn },
    { label: 'Resolved', value: allComplaints.length - openComplaints,   fill: COLORS.active },
    { label: 'Total',    value: allComplaints.length,                    fill: COLORS.primary },
  ];

  // ── Key insights ──────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { type: 'positive' | 'warning' | 'danger'; text: string }[] = [];

    const activeRate = Math.round((activeCount / totalStudents) * 100);
    if (activeRate >= 60)
      list.push({ type: 'positive', text: `${activeRate}% of students are actively subscribed — healthy retention rate.` });
    else
      list.push({ type: 'warning', text: `Active rate is ${activeRate}% — consider reviewing teacher assignment process.` });

    if (openComplaints > 0)
      list.push({ type: 'danger', text: `${openComplaints} unresolved complaint${openComplaints > 1 ? 's' : ''} need admin attention.` });
    else
      list.push({ type: 'positive', text: 'All complaints are resolved. Great responsiveness from admin team.' });

    if (pausedCount > 0)
      list.push({ type: 'warning', text: `${pausedCount} student${pausedCount > 1 ? 's' : ''} currently paused — follow up to re-activate their subscriptions.` });

    const historyCount = students.filter((s) => s.teacherHistory.length > 0).length;
    if (historyCount > 0)
      list.push({ type: 'warning', text: `${historyCount} student${historyCount > 1 ? 's have' : ' has'} switched teachers — investigate if there's a pattern.` });

    const topTeacher = studentsPerTeacher.sort((a, b) => b.sessions - a.sessions)[0];
    if (topTeacher)
      list.push({ type: 'positive', text: `${topTeacher.fullName} leads with ${topTeacher.sessions} completed sessions.` });

    const avgScore = Math.round(
      students.flatMap((s) => s.sessions).reduce((a, s) => a + s.score / s.maxScore, 0) /
        (students.flatMap((s) => s.sessions).length || 1) * 100
    );
    list.push({ type: avgScore >= 80 ? 'positive' : 'warning', text: `Platform-wide average session score: ${avgScore}%.` });

    return list;
  }, [activeCount, totalStudents, openComplaints, pausedCount, students, studentsPerTeacher]);

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-8">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard & Statistics</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Live analytics — Hamilul-Quran platform overview
          </p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1">
          <Activity className="h-3 w-3" /> Live data
        </span>
      </div>

      {/* ── KPI stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Students"     value={totalStudents}  icon={GraduationCap} color="bg-primary-100 text-primary-700" />
        <StatCard label="Active"             value={activeCount}    icon={CheckCircle}   color="bg-emerald-100 text-emerald-700" sub={`${Math.round(activeCount/totalStudents*100)}% of total`} />
        <StatCard label="Paused"             value={pausedCount}    icon={PauseCircle}   color="bg-amber-100 text-amber-700" />
        <StatCard label="Withdrawn"          value={withdrawnCount} icon={XCircle}       color="bg-red-100 text-red-700" />
        <StatCard label="Teachers"           value={teacherCount}   icon={BookOpen}      color="bg-indigo-100 text-indigo-700" sub={`${totalSessions} sessions done`} />
        <StatCard label="Joined Subscriptions" value={joinedSubs}  icon={ClipboardList} color="bg-violet-100 text-violet-700" />
      </div>

      {/* ── Row 1: Status Pie + Monthly joins ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Subscription status pie */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Users} title="Subscription Status Breakdown" desc="Distribution across active, paused & withdrawn" />
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
          {/* Legend */}
          <div className="flex justify-center gap-5 mt-2">
            {statusPie.map((e) => (
              <div key={e.name} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <span className="w-3 h-3 rounded-full" style={{ background: e.fill }} />
                {e.name} ({e.value})
              </div>
            ))}
          </div>
        </div>

        {/* Monthly subscription joins */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Calendar} title="Monthly Subscription Joins" desc="How many students joined each month" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyJoins} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="New subscriptions" fill={COLORS.primary} radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2: Students per teacher bar + Avg score bar ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Students + sessions per teacher */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={BookOpen} title="Teachers — Students & Sessions" desc="Per-teacher workload comparison" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={studentsPerTeacher} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="students" name="Students"  fill={COLORS.primary} radius={[4,4,0,0]} />
              <Bar dataKey="sessions" name="Sessions"  fill={COLORS.blue}    radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg session score % per teacher */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Star} title="Avg Session Score by Teacher" desc="Mean score percentage across all sessions" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={scoresByTeacher} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="avgPct" name="Avg Score %" fill={COLORS.active} radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Teacher rating radar + Complaint bar ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Teacher rating radar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Award} title="Teacher Ratings Comparison" desc="Overall, admin & student rating scores (out of 5)" />
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={90}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="teacher" tick={{ fontSize: 12, fontWeight: 600, fill: '#374151' }} />
              <Radar name="Overall"  dataKey="Overall"  stroke={COLORS.primary}   fill={COLORS.primary}   fillOpacity={0.18} />
              <Radar name="Admin"    dataKey="Admin"    stroke={COLORS.violet}    fill={COLORS.violet}    fillOpacity={0.18} />
              <Radar name="Students" dataKey="Students" stroke={COLORS.active}    fill={COLORS.active}    fillOpacity={0.18} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Complaints overview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={AlertCircle} title="Complaints Overview" desc="Open vs resolved complaints platform-wide" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={complaintBar} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={70} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Count" radius={[0,6,6,0]}>
                {complaintBar.map((e) => (
                  <Cell key={e.label} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Paused students list */}
          {pausedStudents.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <PauseCircle className="h-3.5 w-3.5" /> Paused students
              </p>
              <div className="space-y-1.5">
                {pausedStudents.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-medium text-gray-800">{s.studentName}</span>
                    <span className="text-xs text-gray-500">{s.teacherName.split(' ').pop()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Score trend line ──────────────────────────────────────────── */}
      {(() => {
        // Build a chronological score trend from all sessions
        const allSessions = students
          .flatMap((s) => s.sessions.map((sess) => ({ ...sess, studentName: s.studentName })))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Group by month
        const byMonth: Record<string, { total: number; max: number }> = {};
        for (const sess of allSessions) {
          const key = format(new Date(sess.date), 'MMM yy');
          if (!byMonth[key]) byMonth[key] = { total: 0, max: 0 };
          byMonth[key].total += sess.score;
          byMonth[key].max   += sess.maxScore;
        }
        const trendData = Object.entries(byMonth).map(([month, v]) => ({
          month,
          avgPct: Math.round((v.total / v.max) * 100),
        }));

        return (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <SectionHead icon={TrendingUp} title="Monthly Average Score Trend" desc="Platform-wide session quality over time" />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="avgPct"
                  name="Avg Score %"
                  stroke={COLORS.primary}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: COLORS.primary }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* ── Row 5: Insights panel + Teacher leaderboard ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* AI-style insights */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={MessageSquare} title="Key Insights" desc="Automated analysis of platform data" />
          <div className="space-y-2.5">
            {insights.map((ins, i) => {
              const colors = {
                positive: 'bg-emerald-50 border-emerald-200 text-emerald-800',
                warning:  'bg-amber-50 border-amber-200 text-amber-800',
                danger:   'bg-red-50 border-red-200 text-red-800',
              }[ins.type];
              const Icon = { positive: CheckCircle, warning: AlertCircle, danger: XCircle }[ins.type];
              return (
                <div key={i} className={`flex items-start gap-2.5 border rounded-xl px-3 py-2.5 ${colors}`}>
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{ins.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teacher leaderboard */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <SectionHead icon={Award} title="Teacher Leaderboard" desc="Ranked by sessions completed" />
          <div className="space-y-3">
            {[...teachers]
              .sort((a, b) => b.sessionCount - a.sessionCount)
              .map((t, i) => {
                const avgRating =
                  t.reviews.length > 0
                    ? (t.reviews.reduce((a, r) => a + r.rating, 0) / t.reviews.length).toFixed(1)
                    : '—';
                const rankColors = ['bg-amber-400', 'bg-gray-300', 'bg-orange-400'];
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className={`w-7 h-7 rounded-full ${rankColors[i] ?? 'bg-gray-200'} flex items-center justify-center text-xs font-bold text-white`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{t.teacherName}</p>
                      <p className="text-xs text-gray-500">Age {t.age} · {t.studentCount} students</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary-700">{t.sessionCount}</p>
                      <p className="text-xs text-gray-400">sessions</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span className="text-xs font-bold">{avgRating}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Row 6: Recent complaints feed ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <SectionHead icon={AlertCircle} title="Recent Complaints" desc="Latest complaints across all students" />
        {allComplaints.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <CheckCircle className="h-4 w-4" /> No complaints on the platform.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 text-left">Student</th>
                  <th className="pb-2 text-left">Complaint</th>
                  <th className="pb-2 text-left">Date</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students
                  .flatMap((s) => s.complaints.map((c) => ({ ...c, studentName: s.studentName })))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 6)
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 font-medium text-gray-900 pr-4">{c.studentName}</td>
                      <td className="py-2.5 text-gray-600 max-w-xs truncate pr-4">{c.description}</td>
                      <td className="py-2.5 text-gray-400 whitespace-nowrap pr-4">{format(new Date(c.date), 'MMM d, yyyy')}</td>
                      <td className="py-2.5 text-center">
                        {c.resolved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" /> Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                            <XCircle className="h-3 w-3" /> Open
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
