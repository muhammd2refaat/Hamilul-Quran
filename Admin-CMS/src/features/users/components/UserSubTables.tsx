import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { get } from '@/services/api/client';
import { Loader2 } from 'lucide-react';

interface Complaint {
  id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

interface TeacherHistory {
  id: string;
  assigned_at: string;
  unassigned_at?: string;
  reason?: string;
  teacher_id: string;
}

interface SessionScore {
  id: string;
  date: string;
  score: number;
  notes?: string;
  recitation_type?: string;
  teacher_id: string;
}

export function ComplaintsTable({ userId }: { userId: string }) {
  const [data, setData] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<Complaint[]>(`/users/${userId}/complaints`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5 text-gray-400" /></div>;
  if (!data.length) return <div className="text-sm text-gray-500 py-2">No complaints found.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-4 py-2 rounded-tl-lg">Date</th>
            <th className="px-4 py-2">Subject</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2 whitespace-nowrap">{format(parseISO(c.created_at), 'MMM d, yyyy')}</td>
              <td className="px-4 py-2 font-medium text-gray-900">{c.subject}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeacherHistoryTable({ studentId, resolveTeacherName }: { studentId: string, resolveTeacherName?: (id: string) => string }) {
  const [data, setData] = useState<TeacherHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<TeacherHistory[]>(`/users/${studentId}/teacher-history`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5 text-gray-400" /></div>;
  if (!data.length) return <div className="text-sm text-gray-500 py-2">No teacher assignment history.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-4 py-2 rounded-tl-lg">Teacher</th>
            <th className="px-4 py-2">Assigned</th>
            <th className="px-4 py-2">Unassigned</th>
          </tr>
        </thead>
        <tbody>
          {data.map((h) => (
            <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-900">{resolveTeacherName ? resolveTeacherName(h.teacher_id) : h.teacher_id}</td>
              <td className="px-4 py-2 whitespace-nowrap">{format(parseISO(h.assigned_at), 'MMM d, yyyy')}</td>
              <td className="px-4 py-2 whitespace-nowrap">{h.unassigned_at ? format(parseISO(h.unassigned_at), 'MMM d, yyyy') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SessionScoresTable({ studentId, resolveTeacherName }: { studentId: string, resolveTeacherName?: (id: string) => string }) {
  const [data, setData] = useState<SessionScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<SessionScore[]>(`/users/${studentId}/session-scores`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5 text-gray-400" /></div>;
  if (!data.length) return <div className="text-sm text-gray-500 py-2">No session scores recorded.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-4 py-2 rounded-tl-lg">Date</th>
            <th className="px-4 py-2">Teacher</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2 whitespace-nowrap">{format(parseISO(s.date), 'MMM d, yyyy')}</td>
              <td className="px-4 py-2">{resolveTeacherName ? resolveTeacherName(s.teacher_id) : s.teacher_id}</td>
              <td className="px-4 py-2">{s.recitation_type || '-'}</td>
              <td className="px-4 py-2 font-bold text-gray-900">{s.score}/100</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
