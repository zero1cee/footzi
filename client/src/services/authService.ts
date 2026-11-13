import { parseApiJson } from '@/lib/utils';

export interface SavedAddress {
  _id?: string;
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'demo_admin';
  phone?: string;
  addresses?: SavedAddress[];
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export const authService = {
  async register(data: { name: string; email: string; password: string; phone?: string }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return parseApiJson<AuthResponse>(res, 'Registration failed');
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    return parseApiJson<AuthResponse>(res, 'Invalid email or password');
  },

  async getMe(token: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await parseApiJson<{ user: AuthUser }>(res, 'Failed to authenticate session');
    return body.user;
  },

  async addAddress(address: SavedAddress, token: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(address),
    });

    const body = await parseApiJson<{ user: AuthUser }>(res, 'Failed to save address');
    return body.user;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    }
  },
};
