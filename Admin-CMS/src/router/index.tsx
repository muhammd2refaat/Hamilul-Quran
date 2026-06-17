/**
 * Application router configuration with lazy loading
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { OrganizationsPage } from '@/features/organizations/pages/OrganizationsPage';
import { CountriesPage } from '@/features/countries/pages/CountriesPage';
import { QuizzesPage } from '@/features/quizzes/pages/QuizzesPage';
import { QuestionsPage } from '@/features/quizzes/questions/QuestionsPage';
import { ArticlesPage } from '@/features/articles/pages/ArticlesPage';
import { StoriesPage } from '@/features/stories/pages/StoriesPage';
import { CategoriesPage } from '@/features/products/pages/CategoriesPage';
import { ProductsPage } from '@/features/products/pages/ProductsPage';
import { ProfilePage } from '@/features/settings/pages/SettingsPage';
import { ProtectedRoute } from './ProtectedRoute';
import { LoadingSpinner } from '@/shared/components';
import { WebinarPage } from '@/features/webinar/pages/WebinarPage';
import { WhatsNewPage } from '@/features/whats-new/pages/WhatsNewPage';
import { AdminsPage } from '@/features/admins/pages/AdminsPage';

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" />
  </div>
);

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
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'organizations',
        element: <OrganizationsPage />,
      },
      {
        path: 'countries',
        element: <CountriesPage />,
      },
      {
        path: 'quizzes',
        element: <QuizzesPage />,
      },
      {
        path: 'questions',
        element: <QuestionsPage />,
      },
      {
        path: 'articles',
        element: <ArticlesPage />,
      },
      {
        path: 'stories',
        element: <StoriesPage />,
      },
      {
        path: 'categories',
        element: <CategoriesPage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'webinar',
        element: <WebinarPage />,
      },
      {
        path: 'whats-new',
        element: <WhatsNewPage />,
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
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
