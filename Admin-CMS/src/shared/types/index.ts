/**
 * Common type definitions used across the application
 */

/** Base entity with common fields */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

/** Status types used across modules */
export type EntityStatus = 'active' | 'inactive';
export type ContentStatus = 'draft' | 'published' | 'unpublished' | 'scheduled';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type WebinarStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

/** Country types */
export type Country = 'KSA' | 'UAE';

/** Gender types */
export type Gender = 'Male' | 'Female' | 'Other';

/** Pagination parameters */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/** Filter parameters */
export interface FilterParams {
  search?: string;
  status?: string;
  country?: Country;
  startDate?: string;
  endDate?: string;
  [key: string]: string | undefined;
}

/** Sort configuration */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/** API Response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/** Error response */
export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

/** Select option type */
export interface SelectOption {
  value: string;
  label: string;
}

/** File upload type */
export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

/** Date range type */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/** Table column definition */
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

/** Modal sizes */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/** Button variants */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

/** Button sizes */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

/** Alert types */
export type AlertType = 'success' | 'error' | 'warning' | 'info';

/** Device info for session tracking */
export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  ip: string;
}

/** Session type */
export interface Session {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  current: boolean;
  createdAt: string;
}

/** Admin role */
export type AdminRole = 'Super Admin' | 'Content Admin' | 'Viewer';

/** Notification preference */
export interface NotificationPreference {
  email: boolean;
  push: boolean;
  sms: boolean;
}

/** Audit log entry */
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  details: Record<string, unknown>;
  ipAddress: string;
  timestamp: string;
}

/** Chart data point */
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

/** Time series data point */
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  [key: string]: string | number;
}
