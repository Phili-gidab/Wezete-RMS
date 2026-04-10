import { Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Authenticated app shell: sidebar + scrollable content area.
 * Redirects to /login when there is no session.
 */
export default function MainLayout() {
  const token = useAuthStore((s) => s.accessToken);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Main content — offset by sidebar width (w-56 = 14 rem) */}
      <main className="ml-56 p-6">
        <Outlet />
      </main>

      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0A3D39',
            color: '#fff',
            fontSize: '14px',
          },
        }}
      />
    </div>
  );
}
