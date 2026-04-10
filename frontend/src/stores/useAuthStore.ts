import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Role level mapping (matches backend RBAC levels from tech spec)
 *
 *  1 = Customer (base)
 *  2 = Barista
 *  3 = Chef (Kitchen Staff)
 *  4 = Waiter
 *  5 = Cashier
 *  6 = Inventory Manager
 *  7 = Admin / Manager
 *  8 = Super Admin (highest)
 */
export type RoleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: RoleId;
  restaurantId?: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;

  // Actions
  login: (payload: { accessToken: string; user: User }) => void;
  logout: () => void;
  setToken: (accessToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,

      login: ({ accessToken, user }) =>
        set({ accessToken, user }),

      logout: () =>
        set({ accessToken: null, user: null }),

      setToken: (accessToken) =>
        set({ accessToken }),
    }),
    {
      name: 'wezete-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
);
