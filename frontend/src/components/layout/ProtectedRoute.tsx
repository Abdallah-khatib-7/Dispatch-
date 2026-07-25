import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';

export const ProtectedRoute = () => {
  const { isConnected } = useAuth();
  const location = useLocation();

  if (!isConnected) {
    return <Navigate to="/connect" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};
