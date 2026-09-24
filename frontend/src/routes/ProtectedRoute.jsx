import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    // Avoid a flash-redirect to /login while we're still checking
    // an existing token on first load.
    return (
      <div className="min-h-screen flex items-center justify-center bg-card text-ink/40 text-sm font-mono">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
