import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { useAuthStore } from '@/store/useAuthStore';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/login' }),
  };
});

describe('LoginPage Editorial Luxury Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  });

  it('renders editorial branding, patron privileges, and core login fields', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Editorial and heading content
    expect(screen.getByRole('heading', { level: 1, name: /sign in to footzi/i })).toBeInTheDocument();
    expect(screen.getByText(/every stitch an ode to four centuries of agra cordwaining heritage/i)).toBeInTheDocument();
    expect(screen.getByText(/workshop-direct delhivery express/i)).toBeInTheDocument();
    expect(screen.getByText(/complimentary 7-day size exchanges/i)).toBeInTheDocument();

    // Form inputs
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter footzi privé/i })).toBeInTheDocument();

    // Guest bridge link
    expect(screen.getByText(/placed an order as a guest\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /track/i })).toHaveAttribute('href', '/track-order');
  });

  it('toggles password visibility with accessible button', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText(/^password/i);
    const toggleBtn = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays CapsLock warning alert when CapsLock modifier is detected', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText(/^password/i);

    // Simulate keydown with CapsLock on
    fireEvent.keyDown(passwordInput, {
      key: 'A',
      modifierCapsLock: true,
      getModifierState: (key: string) => key === 'CapsLock',
    });

    expect(screen.getByText(/capslock is active on your keyboard/i)).toBeInTheDocument();
  });

  it('expands discreet demo access panel and executes 1-click demo login', async () => {
    const loginSpy = vi.spyOn(useAuthStore.getState(), 'login').mockResolvedValue(true);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Demo panel starts collapsed
    expect(screen.queryByText(/instant demo access/i)).not.toBeInTheDocument();

    const triggerBtn = screen.getByRole('button', { name: /reviewing or testing footzi\? click for instant demo credentials/i });
    fireEvent.click(triggerBtn);

    // Panel expands
    expect(screen.getByText(/instant demo access \(pre-populated\)/i)).toBeInTheDocument();

    // Click patron demo
    const patronDemoBtn = screen.getByRole('button', { name: /patron demo/i });
    await act(async () => {
      fireEvent.click(patronDemoBtn);
    });

    expect(loginSpy).toHaveBeenCalledWith('patron@footzi.in', 'Footzi@2026');
    expect(mockNavigate).toHaveBeenCalledWith('/account', { replace: true });
  });
});
