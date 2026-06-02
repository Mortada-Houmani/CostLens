import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isDemoMode } from '../demo/mockData';
import { hasAccessToken } from './accessToken';

export function RequireAccess() {
  const location = useLocation();

  if (isDemoMode || hasAccessToken()) {
    return <Outlet />;
  }

  return <Navigate to="/login" replace state={{ from: location }} />;
}
