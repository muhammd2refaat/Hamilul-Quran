/**
 * Application router configuration with lazy loading
 */


import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { TeachersPage } from '@/features/users/pages/TeachersPage';
import { StudentsPage } from '@/features/users/pages/StudentsPage';

import { ProfilePage } from '@/features/settings/pages/SettingsPage';
import { ProtectedRoute } from './ProtectedRoute';


import { AdminsPage } from '@/features/admins/pages/AdminsPage';
import MemorizationLayout from '@/layouts/MemorizationLayout';
import MemorizationMode from '@/features/memorization/MemorizationMode';
import { PlansPage } from '@/features/plans/pages/PlansPage';
import { AllocationsPage } from '@/features/allocations/pages/AllocationsPage';
import { SubscriptionsPage } from '@/features/subscriptions/pages/SubscriptionsPage';
import { ComplaintsPage } from '@/features/complaints/pages/ComplaintsPage';
import { RequestsPage } from '@/features/requests/pages/RequestsPage';



// Not found page
const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
    <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
    <h2 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h2>
    <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
    <a
      href="/dashboard"
      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
    >
      Go to Dashboard
    </a>
  </div>
);

// Unauthorized page
const UnauthorizedPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
    <h1 className="text-6xl font-bold text-gray-300 mb-4">403</h1>
    <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
    <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
    <a
      href="/dashboard"
      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
    >
      Go to Dashboard
    </a>
  </div>
);

export const router = createBrowserRouter([
  // Auth routes
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  // Protected routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'plans',
        element: <PlansPage />,
      },
      {
        path: 'allocations',
        element: <AllocationsPage />,
      },
      {
        path: 'subscriptions',
        element: <SubscriptionsPage />,
      },
      {
        path: 'students',
        element: <StudentsPage />,
      },
      {
        path: 'teachers',
        element: <TeachersPage />,
      },
      {
        path: 'complaints',
        element: <ComplaintsPage />,
      },
      {
        path: 'requests',
        element: <RequestsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'admins',
        element: <AdminsPage />,
      },
      {
        path: '/unauthorized',
        element: <UnauthorizedPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: '/memorize',
    element: (
      <ProtectedRoute>
        <MemorizationLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <MemorizationMode />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);


