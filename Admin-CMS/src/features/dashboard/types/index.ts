/**
 * Dashboard module types
 */

// ─── Real platform metrics (GET /dashboard/metrics) ────────────────────────────

export interface SignupPoint {
  month: string; // "YYYY-MM"
  count: number;
}

export interface RecentSignup {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface ScorePoint {
  month: string; // "YYYY-MM"
  avgPct: number;
  count: number;
}

export interface TeacherScoreboardItem {
  teacherId: string;
  teacherName: string;
  avgPct: number;
  sessionCount: number;
}

export interface AttendancePoint {
  week: string; // "YYYY-MM-DD", the Monday the week starts on
  ratePct: number;
}

export interface PlatformMetrics {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  usersByStatus: Record<string, number>;
  complaintsByStatus: Record<string, number>;
  totalAllocations: number;
  totalCountries: number;
  signupsByMonth: SignupPoint[];
  recentSignups: RecentSignup[];

  avgSessionScorePct: number | null;
  scoreTrendByMonth: ScorePoint[];
  topTeachersByScore: TeacherScoreboardItem[];

  attendanceBothJoinedRatePct: number | null;
  attendanceTrendByWeek: AttendancePoint[];

  // Categorical only — there's no price field anywhere in the schema, so
  // this is subscription counts, not a $ revenue figure.
  subscriptionsByStatus: Record<string, number>;
  subscriptionsByPlan: Record<string, number>;
}
