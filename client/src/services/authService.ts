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

  async updateProfile(data: { name?: string; phone?: string }, token: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return (await parseApiJson<{ user: AuthUser }>(res, 'Failed to update your profile')).user;
  },

  async updateAddress(id: string, address: Partial<SavedAddress>, token: string): Promise<AuthUser> {
    const res = await fetch(`/api/auth/addresses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(address),
    });
    return (await parseApiJson<{ user: AuthUser }>(res, 'Failed to update the address')).user;
  },

  async deleteAddress(id: string, token: string): Promise<AuthUser> {
    const res = await fetch(`/api/auth/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await parseApiJson<{ user: AuthUser }>(res, 'Failed to remove the address')).user;
  },

  async changePassword(currentPassword: string, newPassword: string, token: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return parseApiJson<AuthResponse>(res, 'Failed to change your password');
  },

  async forgotPassword(email: string): Promise<string> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return (await parseApiJson<{ message: string }>(res, 'Could not send the reset email')).message;
  },

  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    return parseApiJson<AuthResponse>(res, 'Could not reset your password');
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    }
  },
};
