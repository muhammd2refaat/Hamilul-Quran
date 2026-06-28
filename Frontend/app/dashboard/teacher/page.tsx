"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { type User } from "@/types/user";
import { type Allocation } from "@/types/dashboard";

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: userData } = await apiClient.get<User>("/users/me");
        setUser(userData);

        const { data: allocData } = await apiClient.get<Allocation[]>("/allocations/me");
        setAllocations(allocData);
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card className="border-amber-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-600" />
              Welcome back, Teacher {user.first_name}!
            </CardTitle>
            <CardDescription>Manage your students and recitation sessions here.</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              My Assigned Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Sessions / Week</TableHead>
                  <TableHead>Duration (mins)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell className="font-mono text-xs">{alloc.student_id.substring(0,8)}...</TableCell>
                    <TableCell>{alloc.sessions_per_week}</TableCell>
                    <TableCell>{alloc.duration}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="h-8">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {allocations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500">No students assigned yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
