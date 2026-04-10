import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRedirect from './components/RoleRedirect';
import Unauthorized from './pages/Unauthorized';
import Login from './pages/Login';
import Register from './pages/Register';
import DevLogin from './pages/DevLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import MenuManagement from './pages/admin/MenuManagement';
import OrdersBoard from './pages/waiter/OrdersBoard';
import KitchenDisplay from './pages/kds/KitchenDisplay';
import CashierDashboard from './pages/cashier/CashierDashboard';
import InventoryManagement from './pages/inventory/InventoryManagement';

// Placeholder for pages still under construction
function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A3D39]">{title}</h1>
      <p className="mt-1 text-slate-500">This page is under construction.</p>
    </div>
  );
}

const router = createBrowserRouter([
  // Root — redirect to role-appropriate home
  {
    path: '/',
    element: <RoleRedirect />,
  },

  // Public routes
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/dev-login', element: <DevLogin /> },
  { path: '/unauthorized', element: <Unauthorized /> },

  // Authenticated app shell
  {
    element: <MainLayout />,
    children: [
      // Admin / Manager (roles 7, 8)
      {
        element: <ProtectedRoute allowedRoles={[7, 8]} />,
        children: [
          { path: '/admin', element: <AdminDashboard /> },
          { path: '/menu', element: <MenuManagement /> },
          { path: '/staff', element: <Placeholder title="Staff Management" /> },
          { path: '/accounting', element: <Placeholder title="Reports & Accounting" /> },
          { path: '/settings', element: <Placeholder title="Settings" /> },
        ],
      },

      // Inventory (roles 6, 7, 8)
      {
        element: <ProtectedRoute allowedRoles={[6, 7, 8]} />,
        children: [
          { path: '/inventory', element: <InventoryManagement /> },
        ],
      },

      // Kitchen / Bar display (roles 2, 3, 7, 8)
      {
        element: <ProtectedRoute allowedRoles={[2, 3, 7, 8]} />,
        children: [
          { path: '/kds', element: <KitchenDisplay /> },
        ],
      },

      // Cashier (roles 5, 7, 8)
      {
        element: <ProtectedRoute allowedRoles={[5, 7, 8]} />,
        children: [
          { path: '/cashier', element: <CashierDashboard /> },
        ],
      },

      // Waiter order board (roles 4, 7, 8)
      {
        element: <ProtectedRoute allowedRoles={[4, 7, 8]} />,
        children: [
          { path: '/orders', element: <OrdersBoard /> },
          { path: '/tables', element: <Placeholder title="Tables" /> },
        ],
      },
    ],
  },
]);

export default router;
