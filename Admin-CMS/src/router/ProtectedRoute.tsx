/**
 * Protected route wrapper - requires authentication
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { ForcePasswordChange } from '@/features/auth/components/AccountPassword';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, syncMe } = useAuthStore();
  const location = useLocation();
  const [synced, setSynced] = useState(false);

  // The stored user can be stale (Super Admin flag, a password reset by the
  // Super Admin) — re-read it once per page load.
  useEffect(() => {
    if (!isAuthenticated) return;
    syncMe()
      .catch(() => undefined)
      .finally(() => setSynced(true));
  }, [isAuthenticated, syncMe]);

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // On a temporary password: nothing else until a new one is set.
  if (user?.mustChangePassword) {
    return <ForcePasswordChange />;
  }
  if (!synced && !user) return null;

  // Check role-based access
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
