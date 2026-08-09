import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/** Soft-lands on dashboard and scrolls to a section hash (path / subjects / analytics). */
export default function DashboardSectionRedirect({ hash }: { hash: string }) {
  const location = useLocation();

  useEffect(() => {
    const id = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
    return () => window.clearTimeout(id);
  }, [hash, location.key]);

  return <Navigate to={`/dashboard#${hash}`} replace />;
}
