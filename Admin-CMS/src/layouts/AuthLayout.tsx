/**
 * Auth layout for login and password reset pages
 */

import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';

export function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  // Redirect to dashboard if already logged in
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">QV</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">QV Admin Panel</h1>
          <p className="text-gray-600 mt-1">Healthcare Wellness Engagement Platform</p>
        </div>

        {/* Form container */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} QV Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;
