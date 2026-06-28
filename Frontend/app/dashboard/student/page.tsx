"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Calendar, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { type User } from "@/types/user";
import { type Allocation, type SessionScore, type TeacherHistory } from "@/types/dashboard";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [scores, setScores] = useState<SessionScore[]>([]);
  const [history, setHistory] = useState<TeacherHistory[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: userData } = await apiClient.get<User>("/users/me");
        setUser(userData);

        const [allocRes, scoresRes, historyRes] = await Promise.all([
          apiClient.get<Allocation[]>("/allocations/me"),
          apiClient.get<SessionScore[]>("/users/me/session-scores"),
          apiClient.get<TeacherHistory[]>("/users/me/teacher-history")
        ]);

        setAllocations(allocRes.data);
        setScores(scoresRes.data);
        setHistory(historyRes.data);
      } catch (err: any) {
        console.error(err);
        if (err.response?.status === 401) {
          router.push("/login");
        }
      }
    }
    fetchData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    document.cookie = "access_token=; path=/; max-age=0";
    router.push("/login");
  };

  if (!user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-emerald-600" />
              Welcome back, {user.first_name}!
            </CardTitle>
            <CardDescription>Manage your memorization journey and sessions here.</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Allocations Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                My Allocations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher ID</TableHead>
                    <TableHead>Sessions/Week</TableHead>
                    <TableHead>Duration (mins)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-mono text-xs">{alloc.teacher_id.substring(0,8)}...</TableCell>
                      <TableCell>{alloc.sessions_per_week}</TableCell>
                      <TableCell>{alloc.duration}</TableCell>
                    </TableRow>
                  ))}
                  {allocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">No allocations found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Session Scores Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-500" />
                Recent Session Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((score) => (
                    <TableRow key={score.id}>
                      <TableCell>{new Date(score.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={score.score >= 90 ? "default" : "secondary"} className={score.score >= 90 ? "bg-emerald-500" : ""}>
                          {score.score}/100
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {scores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-slate-500">No scores recorded yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Teacher History Table */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Teacher History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher ID</TableHead>
                    <TableHead>Assigned At</TableHead>
                    <TableHead>Ended At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((hist) => (
                    <TableRow key={hist.id}>
                      <TableCell className="font-mono text-xs">{hist.teacher_id.substring(0,8)}...</TableCell>
                      <TableCell>{new Date(hist.assigned_at).toLocaleDateString()}</TableCell>
                      <TableCell>{hist.ended_at ? new Date(hist.ended_at).toLocaleDateString() : "Current"}</TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">No teacher history found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
