/**
 * Complaints page — reads from Zustand store, actions update live count
 */

import { useState, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  User,
  BookOpen,
  Search,
  Filter,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  type PlatformComplaint,
  type ComplaintStatus,
  type ComplaintFrom,
  type ComplaintCategory,
} from '@/mock-data/complaints-requests';
import { useComplaintsStore } from '../store/complaintsStore';
import { format } from 'date-fns';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ComplaintStatus, { label: string; cls: string; icon: React.ElementType }> = {
  open:      { label: 'Open',      cls: 'bg-red-100 text-red-700 border-red-200',             icon: AlertCircle },
  in_review: { label: 'In Review', cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: Clock },
  resolved:  { label: 'Resolved',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
  dismissed: { label: 'Dismissed', cls: 'bg-gray-100 text-gray-600 border-gray-200',          icon: XCircle },
};

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  late_session: 'Late Session',
  no_feedback:  'No Feedback',
  curriculum:   'Curriculum',
  behaviour:    'Behaviour',
  technical:    'Technical',
  other:        'Other',
};

const LEFT_BORDER: Record<ComplaintStatus, string> = {
  open:      'border-l-red-400',
  in_review: 'border-l-amber-400',
  resolved:  'border-l-emerald-500',
  dismissed: 'border-l-gray-300',
};

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const { label, cls, icon: Icon } = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function FromBadge({ from }: { from: ComplaintFrom }) {
  return from === 'student' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
      <User className="h-3 w-3" /> Student
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 border border-primary-200">
      <BookOpen className="h-3 w-3" /> Teacher
    </span>
  );
}

// ─── Complaint Card ───────────────────────────────────────────────────────────

function ComplaintCard({ complaint }: { complaint: PlatformComplaint }) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useComplaintsStore((s) => s.updateStatus);

  const canAction = complaint.status === 'open' || complaint.status === 'in_review';

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${LEFT_BORDER[complaint.status]} shadow-sm overflow-hidden transition-shadow hover:shadow-md`}>
      {/* Summary */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <FromBadge from={complaint.from} />
            <span className="text-sm font-bold text-gray-900">{complaint.filedByName}</span>
            <span className="text-xs text-gray-400">→ about →</span>
            <span className="text-sm font-semibold text-gray-700">{complaint.aboutName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[complaint.category]}
            </span>
            <span className="text-xs text-gray-400">{format(new Date(complaint.date), 'MMM d, yyyy')}</span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">{complaint.description}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={complaint.status} />
          <button
            onClick={() => setExpanded((o) => !o)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Full Description
            </p>
            <p className="text-sm text-gray-800">{complaint.description}</p>
          </div>

          {complaint.adminNote && (
            <div className="bg-primary-50 rounded-xl border border-primary-100 p-3">
              <p className="text-xs font-semibold text-primary-700 mb-1 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Admin Note
              </p>
              <p className="text-sm text-gray-700 italic">"{complaint.adminNote}"</p>
            </div>
          )}

          {/* Action buttons — only when complaint is actionable */}
          {canAction && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => updateStatus(complaint.id, 'in_review')}
                disabled={complaint.status === 'in_review'}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Mark In Review
              </button>
              <button
                onClick={() => updateStatus(complaint.id, 'resolved', 'Resolved by admin.')}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Resolve
              </button>
              <button
                onClick={() => updateStatus(complaint.id, 'dismissed', 'Dismissed by admin.')}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ComplaintsPage() {
  const { complaints, fetchComplaints } = useComplaintsStore();
  
  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<ComplaintStatus | ''>('');
  const [fromFilter, setFrom]     = useState<ComplaintFrom | ''>('');

  const stats = {
    total:     complaints.length,
    open:      complaints.filter((c) => c.status === 'open').length,
    inReview:  complaints.filter((c) => c.status === 'in_review').length,
    resolved:  complaints.filter((c) => c.status === 'resolved').length,
    dismissed: complaints.filter((c) => c.status === 'dismissed').length,
  };

  const filtered = useMemo(() => {
    let list = complaints;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.filedByName.toLowerCase().includes(q) ||
          c.aboutName.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    if (fromFilter)   list = list.filter((c) => c.from === fromFilter);
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [complaints, search, statusFilter, fromFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
        <p className="text-gray-500 mt-1 text-sm">
          All platform complaints — from students and teachers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: stats.total,     cls: 'bg-gray-50 text-gray-700',       iconBg: 'bg-gray-200',    icon: AlertCircle },
          { label: 'Open',      value: stats.open,      cls: 'bg-red-50 text-red-700',         iconBg: 'bg-red-100',     icon: AlertCircle },
          { label: 'In Review', value: stats.inReview,  cls: 'bg-amber-50 text-amber-700',     iconBg: 'bg-amber-100',   icon: Clock },
          { label: 'Resolved',  value: stats.resolved,  cls: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100', icon: CheckCircle },
          { label: 'Dismissed', value: stats.dismissed, cls: 'bg-gray-50 text-gray-500',       iconBg: 'bg-gray-100',    icon: XCircle },
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search complaints…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <select value={fromFilter} onChange={(e) => setFrom(e.target.value as ComplaintFrom | '')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Sources</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value as ComplaintStatus | '')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          <Filter className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No complaints match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => <ComplaintCard key={c.id} complaint={c} />)}
        </div>
      )}
    </div>
  );
}

export default ComplaintsPage;
