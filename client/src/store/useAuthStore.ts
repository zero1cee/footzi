import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, AuthUser, SavedAddress } from '@/services/authService';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  loginAsDemo: (role?: 'patron' | 'admin') => Promise<boolean>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<boolean>;
  addAddress: (address: SavedAddress) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
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
          // If live backend fails, check if valid demo credentials match
          if (email === 'patron@footzi.in' && password === 'Footzi@2026') {
            console.warn('[Footzi Auth] Live login unavailable, falling back to simulated patron session.');
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
            console.warn('[Footzi Auth] Live login unavailable, falling back to simulated admin session.');
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

      loginAsDemo: async (role = 'patron') => {
        const email = role === 'admin' ? 'admin@footzi.in' : 'patron@footzi.in';
        return get().login(email, 'Footzi@2026');
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

      addAddress: async (address) => {
        const { token, user } = get();
        if (!token) return false;
        set({ error: null });

        try {
          const updatedUser = await authService.addAddress(address, token);
          set({ user: updatedUser });
          return true;
        } catch (err: any) {
          // If backend offline in simulated demo mode, append locally
          if (token.startsWith('demo-jwt-token') && user) {
            const existing = user.addresses || [];
            const next = address.isDefault
              ? existing.map((a) => ({ ...a, isDefault: false }))
              : [...existing];
            next.push(address);
            set({ user: { ...user, addresses: next } });
            return true;
          }
          set({ error: err.message || 'Failed to save address' });
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

        // Auto-heal legacy mock tokens from local storage so live backend routes work cleanly
        if (token.startsWith('demo-jwt-token')) {
          set({ user: null, token: null, isAuthenticated: false });
          return;
        }

        try {
          const user = await authService.getMe(token);
          set({ user, isAuthenticated: true });
        } catch {
          // Token expired or invalid signature
          set({ user: null, token: null, isAuthenticated: false });
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
