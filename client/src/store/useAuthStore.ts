import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, AuthUser } from '@/services/authService';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: {
        _id: 'demo-user-1',
        name: 'Arjun Kapoor',
        email: 'patron@footzi.in',
        role: 'customer',
        phone: '+91 98765 43210',
      },
      token: 'demo-jwt-token-authenticated',
      isAuthenticated: true,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.login(email, password);
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (err: any) {
          // If backend isn't reachable, support simulated fallback for demo accounts
          if (email === 'patron@footzi.in' && password === 'Footzi@2026') {
            set({
              user: {
                _id: 'demo-user-1',
                name: 'Arjun Kapoor',
                email: 'patron@footzi.in',
                role: 'customer',
                phone: '+91 98765 43210',
              },
              token: 'demo-jwt-token-authenticated',
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }
          if (email === 'admin@footzi.in' && password === 'Footzi@2026') {
            set({
              user: {
                _id: 'demo-admin-1',
                name: 'Devraj Chauhan',
                email: 'admin@footzi.in',
                role: 'admin',
                phone: '+91 98111 22334',
              },
              token: 'demo-jwt-token-admin',
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }

          set({ error: err.message || 'Login failed', isLoading: false });
          return false;
        }
      },

      register: async (name, email, password, phone) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.register({ name, email, password, phone });
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (err: any) {
          set({ error: err.message || 'Registration failed', isLoading: false });
          return false;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) return;

        try {
          const user = await authService.getMe(token);
          set({ user, isAuthenticated: true });
        } catch {
          // Keep current state or logout if invalidated
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'footzi-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
