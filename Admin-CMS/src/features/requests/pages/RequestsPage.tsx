/**
 * Requests page — reads from Zustand store, actions update live count
 */

import { useState, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  UserPlus,
  ArrowRightLeft,
  PauseCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  User,
  BookOpen,
} from 'lucide-react';
import {
  type PlatformRequest,
  type RequestStatus,
  type RequestType,
} from '@/mock-data/complaints-requests';
import { useRequestsStore } from '../store/requestsStore';
import { format } from 'date-fns';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<RequestStatus, { label: string; cls: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: Clock },
  in_review: { label: 'In Review', cls: 'bg-blue-100 text-blue-700 border-blue-200',           icon: AlertCircle },
  approved:  { label: 'Approved',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',  icon: CheckCircle },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-700 border-red-200',             icon: XCircle },
};

const TYPE_CFG: Record<RequestType, { label: string; icon: React.ElementType; color: string }> = {
  reschedule:     { label: 'Reschedule',     icon: Calendar,       color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  new_enrollment: { label: 'New Enrollment', icon: UserPlus,       color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  change_teacher: { label: 'Change Teacher', icon: ArrowRightLeft, color: 'bg-violet-100 text-violet-700 border-violet-200' },
  pause:          { label: 'Pause',          icon: PauseCircle,    color: 'bg-amber-100 text-amber-700 border-amber-200' },
  other:          { label: 'Other',          icon: ClipboardList,  color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const LEFT_BORDER: Record<RequestStatus, string> = {
  pending:   'border-l-amber-400',
  in_review: 'border-l-blue-400',
  approved:  'border-l-emerald-500',
  rejected:  'border-l-red-400',
};

const ROLE_ICON: Record<string, React.ElementType> = {
  student:  User,
  teacher:  BookOpen,
  guardian: User,
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, cls, icon: Icon } = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function TypeBadge({ type }: { type: RequestType }) {
  const { label, icon: Icon, color } = TYPE_CFG[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ request }: { request: PlatformRequest }) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useRequestsStore((s) => s.updateStatus);
  const RoleIcon = ROLE_ICON[request.fromRole] ?? User;

  const canAction = request.status === 'pending' || request.status === 'in_review';

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${LEFT_BORDER[request.status]} shadow-sm overflow-hidden transition-shadow hover:shadow-md`}>
      {/* Summary */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={request.type} />
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full capitalize">
              <RoleIcon className="h-3 w-3" /> {request.fromRole}
            </span>
            <span className="text-sm font-bold text-gray-900">{request.fromName}</span>
            <span className="text-xs text-gray-400">{format(new Date(request.date), 'MMM d, yyyy')}</span>
          </div>

          {request.type === 'reschedule' && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600">
              <span className="bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg font-medium text-red-700">
                {request.currentDay} {request.currentTime}
              </span>
              <span>→</span>
              <span className="bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg font-medium text-emerald-700">
                {request.requestedDay} {request.requestedTime}
              </span>
            </div>
          )}
          {request.type === 'new_enrollment' && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg text-gray-700">
                Plan: <strong>{request.requestedPlan}</strong>
              </span>
              {request.requestedTeacher && (
                <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg text-gray-700">
                  Teacher: <strong>{request.requestedTeacher}</strong>
                </span>
              )}
            </div>
          )}
          {request.type === 'change_teacher' && request.requestedTeacher && (
            <div className="text-xs text-gray-600">
              Requesting: <span className="font-semibold text-primary-700">{request.requestedTeacher}</span>
            </div>
          )}

          <p className="text-sm text-gray-600 line-clamp-2">{request.details}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={request.status} />
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
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Full Details</p>
            <p className="text-sm text-gray-800">{request.details}</p>
          </div>

          {request.adminNote && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-primary-700 mb-1 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Admin Response
              </p>
              <p className="text-sm text-gray-700 italic">"{request.adminNote}"</p>
            </div>
          )}

          {/* Live action buttons — only for actionable statuses */}
          {canAction && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => updateStatus(request.id, 'approved', 'Approved by admin.')}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => updateStatus(request.id, 'in_review')}
                disabled={request.status === 'in_review'}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                In Review
              </button>
              <button
                onClick={() => updateStatus(request.id, 'rejected', 'Rejected by admin.')}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RequestsPage() {
  const { requests } = useRequestsStore();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<RequestStatus | ''>('');
  const [typeFilter, setType]     = useState<RequestType | ''>('');

  const stats = {
    total:    requests.length,
    pending:  requests.filter((r) => r.status === 'pending').length,
    inReview: requests.filter((r) => r.status === 'in_review').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const filtered = useMemo(() => {
    let list = requests;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.fromName.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.requestedTeacher?.toLowerCase().includes(q) ||
          r.requestedPlan?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (typeFilter)   list = list.filter((r) => r.type === typeFilter);
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [requests, search, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Student, guardian and teacher requests — reschedule, enrollment, teacher changes and pauses.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: stats.total,    cls: 'bg-gray-50 text-gray-700',       iconBg: 'bg-gray-200',    icon: ClipboardList },
          { label: 'Pending',   value: stats.pending,  cls: 'bg-amber-50 text-amber-700',     iconBg: 'bg-amber-100',   icon: Clock },
          { label: 'In Review', value: stats.inReview, cls: 'bg-blue-50 text-blue-700',       iconBg: 'bg-blue-100',    icon: AlertCircle },
          { label: 'Approved',  value: stats.approved, cls: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100', icon: CheckCircle },
          { label: 'Rejected',  value: stats.rejected, cls: 'bg-red-50 text-red-700',         iconBg: 'bg-red-100',     icon: XCircle },
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
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setType(e.target.value as RequestType | '')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="reschedule">Reschedule</option>
          <option value="new_enrollment">New Enrollment</option>
          <option value="change_teacher">Change Teacher</option>
          <option value="pause">Pause</option>
          <option value="other">Other</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value as RequestStatus | '')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          <Filter className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No requests match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <RequestCard key={r.id} request={r} />)}
        </div>
      )}
    </div>
  );
}

export default RequestsPage;
