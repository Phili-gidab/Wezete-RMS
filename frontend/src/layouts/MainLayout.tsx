import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import { useAuthStore } from '../stores/useAuthStore';

export default function MainLayout() {
  const token = useAuthStore((s) => s.accessToken);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg hover:bg-slate-100"
        >
          <svg className="w-6 h-6 text-[#0A3D39]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0A3D39] text-white text-xs font-bold">G</span>
          <span className="text-sm font-semibold text-[#0A3D39]">Green Mark</span>
        </div>
        <NotificationBell />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, slide-in when open */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:z-30
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="lg:ml-56 p-4 sm:p-6">
        <div className="hidden lg:flex justify-end mb-4">
          <NotificationBell />
        </div>
        <Outlet />
      </main>

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
