/**
 * Application-wide constants
 */

/** API endpoints */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_2FA: '/auth/verify-2fa',
    SETUP_2FA: '/auth/setup-2fa',
    PASSWORD_RESET_REQUEST: '/auth/password-reset-request',
    PASSWORD_RESET: '/auth/password-reset',
    SESSIONS: '/auth/sessions',
  },
  USERS: {
    BASE: '/users',
    EXPORT: '/users/export',
    BULK: '/users/bulk',
    ENGAGEMENT: '/users/engagement',
  },
  ORGANIZATIONS: {
    BASE: '/organizations',
    ANALYTICS: '/organizations/analytics',
  },
  QUIZZES: {
    BASE: '/quizzes',
    QUESTIONS: '/quizzes/questions',
    ANALYTICS: '/quizzes/analytics',
  },
  ARTICLES: {
    BASE: '/articles',
    ANALYTICS: '/articles/analytics',
  },
  WEBINARS: {
    BASE: '/webinars',
    ATTENDEES: '/webinars/attendees',
    ANALYTICS: '/webinars/analytics',
  },
  STORIES: {
    BASE: '/stories',
    ANALYTICS: '/stories/analytics',
  },
  PRODUCTS: {
    BASE: '/products',
    CATEGORIES: '/products/categories',
  },
  SETTINGS: {
    ADMINS: '/settings/admins',
    PROFILE: '/settings/profile',
  },
  DASHBOARD: {
    METRICS: '/dashboard/metrics',
    LEADERBOARD: '/dashboard/leaderboard',
    COUNTRY_LEADERBOARD: '/dashboard/country-leaderboard',
  },
  UPLOAD: '/upload',
} as const;

/** Status options */
export const STATUS_OPTIONS = {
  ENTITY: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  USER: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ],
  CONTENT: [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'unpublished', label: 'Unpublished' },
  ],
  WEBINAR: [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
} as const;

/** Country options */
export const COUNTRY_OPTIONS = [
  { value: 'KSA', label: 'Saudi Arabia (KSA)' },
  { value: 'UAE', label: 'United Arab Emirates (UAE)' },
] as const;

/** Gender options */
export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
] as const;

/** Admin role options */
export const ADMIN_ROLE_OPTIONS = [
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Content Admin', label: 'Content Admin' },
  { value: 'Viewer', label: 'Viewer' },
] as const;

/** Product detail types */
export const PRODUCT_DETAIL_TYPES = [
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'benefits', label: 'Therapeutic Benefits' },
  { value: 'usage', label: 'Recommended Usage Instructions' },
  { value: 'precautions', label: 'Precautions & Safety Advice' },
  { value: 'skincare', label: 'Skin Care Advice' },
] as const;

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

/** File upload limits */
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'],
} as const;

/** Session timeouts (in milliseconds) */
export const SESSION = {
  TIMEOUT: 30 * 60 * 1000, // 30 minutes
  WARNING_BEFORE: 2 * 60 * 1000, // 2 minutes before timeout
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const;

/** Authentication settings */
export const AUTH = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
} as const;

/** Cache configuration (in milliseconds) */
export const CACHE = {
  STATIC_DATA: 5 * 60 * 1000, // 5 minutes
  DYNAMIC_DATA: 30 * 1000, // 30 seconds
  STALE_TIME: 60 * 1000, // 1 minute
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1 second base delay
} as const;

/** Date formats */
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  INPUT_WITH_TIME: "yyyy-MM-dd'T'HH:mm",
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  TIME_ONLY: 'HH:mm',
} as const;

/** Chart colors */
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#6366f1',
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  PALETTE: [
    '#3b82f6',
    '#6366f1',
    '#22c55e',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ],
} as const;

/** Breakpoints (matching Tailwind) */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

/** Local storage keys */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'qv_auth_token',
  REFRESH_TOKEN: 'qv_refresh_token',
  USER: 'qv_user',
  THEME: 'qv_theme',
  SIDEBAR_COLLAPSED: 'qv_sidebar_collapsed',
  TABLE_SETTINGS: 'qv_table_settings',
} as const;

/** Navigation items */
export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/users', label: 'Users', icon: 'Users' },
  { path: '/organizations', label: 'Organizations', icon: 'Building2' },
  { path: '/quizzes', label: 'Quizzes', icon: 'HelpCircle' },
  { path: '/articles', label: 'Articles', icon: 'FileText' },
  { path: '/webinars', label: 'Webinars', icon: 'Video' },
  { path: '/stories', label: 'Stories', icon: 'BookOpen' },
  { path: '/products', label: 'Products', icon: 'Package' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
] as const;

/** Query keys for React Query */
export const QUERY_KEYS = {
  DASHBOARD_METRICS: ['dashboard', 'metrics'],
  DASHBOARD_LEADERBOARD: ['dashboard', 'leaderboard'],
  USERS: ['users'],
  USER: (id: string) => ['users', id],
  ORGANIZATIONS: ['organizations'],
  ORGANIZATION: (id: string) => ['organizations', id],
  QUIZZES: ['quizzes'],
  QUIZ: (id: string) => ['quizzes', id],
  QUESTIONS: ['questions'],
  QUESTION: (id: string) => ['questions', id],
  ARTICLES: ['articles'],
  ARTICLE: (id: string) => ['articles', id],
  WEBINARS: ['webinars'],
  WEBINAR: (id: string) => ['webinars', id],
  STORIES: ['stories'],
  STORY: (id: string) => ['stories', id],
  PRODUCTS: ['products'],
  PRODUCT: (id: string) => ['products', id],
  CATEGORIES: ['categories'],
  CATEGORY: (id: string) => ['categories', id],
  ADMINS: ['admins'],
  SESSIONS: ['sessions'],
} as const;
