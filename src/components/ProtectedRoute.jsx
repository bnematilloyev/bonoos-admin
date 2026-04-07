import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/analytics';
    return <Navigate to={from} replace />;
  }

  return children;
};
