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
import StaffManagement from './pages/admin/StaffManagement';
import Reports from './pages/admin/Reports';
import Approvals from './pages/admin/Approvals';
import Settings from './pages/admin/Settings';
import OrdersBoard from './pages/waiter/OrdersBoard';
import KitchenDisplay from './pages/kds/KitchenDisplay';
import CashierDashboard from './pages/cashier/CashierDashboard';
import InventoryManagement from './pages/inventory/InventoryManagement';
import CustomerMenu from './pages/customer/CustomerMenu';
import OrderTracking from './pages/customer/OrderTracking';

const router = createBrowserRouter([
  // Root — redirect to role-appropriate home
  { path: '/', element: <RoleRedirect /> },

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
          { path: '/staff', element: <StaffManagement /> },
          { path: '/approvals', element: <Approvals /> },
          { path: '/accounting', element: <Reports /> },
          { path: '/settings', element: <Settings /> },
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
        ],
      },

    ],
  },

  // Customer — full-page layout (no sidebar)
  {
    element: <ProtectedRoute allowedRoles={[1]} />,
    children: [
      { path: '/customer/menu', element: <CustomerMenu /> },
      { path: '/customer/orders', element: <OrderTracking /> },
    ],
  },
]);

export default router;
