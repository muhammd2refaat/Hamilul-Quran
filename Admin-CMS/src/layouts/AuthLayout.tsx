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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-full mb-4">
            <span className="text-primary-600 font-bold text-2xl">HQ</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-gray-800">Hamilul Quran</h1>
          <p className="text-gray-500 mt-2 font-light">Peaceful Memorization Environment</p>
        </div>

        {/* Form container */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6 font-light">
          © {new Date().getFullYear()} Hamilul Quran. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;
