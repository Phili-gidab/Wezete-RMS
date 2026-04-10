import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';

// ──────────── Auth ────────────

export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post('/api/v1/auth/login', data).then((r) => r.data),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }) => api.post('/api/v1/auth/register', data).then((r) => r.data),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/api/v1/auth/profile').then((r) => r.data),
  });
}

// ──────────── Menu ────────────

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/v1/menu/categories').then((r) => r.data),
  });
}

export function useMenuItems() {
  return useQuery({
    queryKey: ['menuItems'],
    queryFn: () => api.get('/api/v1/menu/items').then((r) => r.data),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; imageUrl?: string; sortOrder?: number }) =>
      api.post('/api/v1/menu/categories', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; imageUrl?: string; sortOrder?: number }) =>
      api.patch(`/api/v1/menu/categories/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/menu/categories/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      price: number;
      categoryId: string;
      description?: string;
      imageUrl?: string;
      prepTime?: number;
      inventoryItems?: Array<{ inventoryItemId: string; quantityUsed: number }>;
    }) => api.post('/api/v1/menu/items', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menuItems'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch(`/api/v1/menu/items/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menuItems'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/menu/items/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menuItems'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ──────────── Orders ────────────

export function useOrders(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => api.get('/api/v1/orders', { params }).then((r) => r.data),
    refetchInterval: 10000, // poll every 10s for live updates
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/api/v1/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orderType: string;
      tableNumber?: number;
      notes?: string;
      items: Array<{
        menuItemId: string;
        quantity: number;
        customisations?: Record<string, any>;
        dietaryNotes?: Record<string, any>;
      }>;
    }) => api.post('/api/v1/orders', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

// ──────────── Payments ────────────

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderId: string; method: 'CASH' | 'CHAPA' }) =>
      api.post('/api/v1/payments', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function usePaymentByOrder(orderId: string) {
  return useQuery({
    queryKey: ['payment', orderId],
    queryFn: () => api.get(`/api/v1/payments/order/${orderId}`).then((r) => r.data),
    enabled: !!orderId,
  });
}

// ──────────── Inventory ────────────

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/api/v1/inventory').then((r) => r.data),
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => api.get('/api/v1/inventory/low-stock').then((r) => r.data),
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      unit: string;
      quantity: number;
      reorderLevel: number;
      costPerUnit: number;
    }) => api.post('/api/v1/inventory', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch(`/api/v1/inventory/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/inventory/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

// ──────────── Users / Staff ────────────

export function useUsers(role?: string) {
  return useQuery({
    queryKey: ['users', role],
    queryFn: () => api.get('/api/v1/users', { params: role ? { role } : undefined }).then((r) => r.data),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
      phone?: string;
    }) => api.post('/api/v1/users', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch(`/api/v1/users/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ──────────── Approvals ────────────

export function useApprovals(status?: string) {
  return useQuery({
    queryKey: ['approvals', status],
    queryFn: () =>
      api.get('/api/v1/approvals', { params: status ? { status } : undefined }).then((r) => r.data),
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: string;
      orderId: string;
      reason: string;
      metadata?: Record<string, unknown>;
    }) => api.post('/api/v1/approvals', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      api.patch(`/api/v1/approvals/${id}/decide`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

// ──────────── Reports ────────────

export function useSalesReport(from?: string, to?: string) {
  return useQuery({
    queryKey: ['reports', 'sales', from, to],
    queryFn: () =>
      api.get('/api/v1/reports/sales', { params: { from, to } }).then((r) => r.data),
  });
}

export function useTopItems(from?: string, to?: string) {
  return useQuery({
    queryKey: ['reports', 'top-items', from, to],
    queryFn: () =>
      api.get('/api/v1/reports/top-items', { params: { from, to } }).then((r) => r.data),
  });
}

export function useInventoryReport() {
  return useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () => api.get('/api/v1/reports/inventory').then((r) => r.data),
  });
}

export function useAuditReport(from?: string, to?: string) {
  return useQuery({
    queryKey: ['reports', 'audit', from, to],
    queryFn: () =>
      api.get('/api/v1/reports/audit', { params: { from, to } }).then((r) => r.data),
  });
}

// ──────────── Downloads / Exports ────────────

async function downloadBlob(url: string, filename: string, params?: Record<string, string>) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function useExportSalesPdf() {
  return useMutation({
    mutationFn: (params?: { from?: string; to?: string }) =>
      downloadBlob('/api/v1/reports/sales/export/pdf', `sales-report.pdf`, params),
  });
}

export function useExportSalesExcel() {
  return useMutation({
    mutationFn: (params?: { from?: string; to?: string }) =>
      downloadBlob('/api/v1/reports/sales/export/xlsx', `sales-report.xlsx`, params),
  });
}

export function useExportInventoryExcel() {
  return useMutation({
    mutationFn: () =>
      downloadBlob('/api/v1/reports/inventory/export/xlsx', `inventory-report.xlsx`),
  });
}

export function useDownloadReceipt() {
  return useMutation({
    mutationFn: (orderId: string) =>
      downloadBlob(`/api/v1/orders/${orderId}/receipt`, `receipt-${orderId.slice(0, 8)}.pdf`),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/api/v1/auth/change-password', data).then((r) => r.data),
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/api/v1/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
  });
}
