import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function RequireAuth({ children }) {
  const { auth, loading } = useAuth();

  // While auth is being checked, render a small placeholder to avoid flash
  if (loading) return <div className="p-6">Loading...</div>;
  if (!auth) return <Navigate to="/login" replace />;
  return children;
}
