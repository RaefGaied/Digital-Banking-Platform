import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  allowedRoles: string[];
  children: React.ReactElement;
}

export default function RequireRole({ allowedRoles, children }: Props) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    // If user is admin but trying to access user-only pages, redirect to admin dashboard
    if (userRole === 'ADMIN') return <Navigate to="/admin" replace />;
    // Otherwise redirect to main dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
