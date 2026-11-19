import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toast } from '@/components/common/Toast';
import { AnnouncementBar } from '@/components/common/AnnouncementBar';
import { Navbar } from '@/components/common/Navbar';
import { useToastStore, toast } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCartStore } from '@/store/useCartStore';

describe('Phase 2 UI Interaction & Micro-Interaction Fixes', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    document.body.style.overflow = '';
  });

  it('Toast notification system renders floating toast messages and auto-dismisses', () => {
    render(<Toast />);

    act(() => {
      toast.success('Agra Artisan Silhouettes Saved');
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Agra Artisan Silhouettes Saved')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText(/dismiss notification/i);
    act(() => {
      fireEvent.click(dismissBtn);
    });

    expect(screen.queryByText('Agra Artisan Silhouettes Saved')).not.toBeInTheDocument();
  });

  it('AnnouncementBar provides a 1-tap copy button for privilege coupon code', () => {
    // Configure announcement with a code
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings,
        announcement: {
          enabled: true,
          label: 'Inaugural Privilege',
          message: 'Enjoy 15% off with code {code}',
          code: 'AGRA15',
        },
      },
    });

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(
      <>
        <Toast />
        <AnnouncementBar />
      </>
    );

    const copyBtn = screen.getByRole('button', { name: /copy privilege code agra15/i });
    expect(copyBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('AGRA15');
    expect(screen.getByText(/privilege code "agra15" copied/i)).toBeInTheDocument();
  });

  it('Navbar locks body scroll when mobile menu is open, and restores it on close', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const menuToggle = screen.getByLabelText(/open mobile menu/i);
    expect(document.body.style.overflow).toBe('');

    // Open mobile menu
    act(() => {
      fireEvent.click(menuToggle);
    });
    expect(document.body.style.overflow).toBe('hidden');

    // Close mobile menu
    act(() => {
      fireEvent.click(menuToggle);
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('Navbar user menu renders an outside touch backdrop so it can be dismissed on mobile', () => {
    // Sign in as user
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'u1',
        name: 'Vikramaditya Rathore',
        email: 'vikram@example.com',
        role: 'buyer',
      } as any,
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const profileBtn = screen.getByLabelText(/user profile menu/i);
    act(() => {
      fireEvent.click(profileBtn);
    });

    // Both dropdown and outside backdrop must exist
    expect(screen.getByText('Account & Orders')).toBeInTheDocument();
    const backdrop = document.querySelector('.fixed.inset-0.z-40');
    expect(backdrop).toBeInTheDocument();

    // Clicking outside backdrop dismisses dropdown
    act(() => {
      fireEvent.click(backdrop!);
    });

    expect(screen.queryByText('Account & Orders')).not.toBeInTheDocument();
  });

  it('Wishlist toggle triggers floating luxury Toast notification', () => {
    render(<Toast />);

    act(() => {
      useCartStore.getState().toggleWishlist('p-belgravia');
    });

    expect(screen.getByText(/added to your private wishlist/i)).toBeInTheDocument();

    act(() => {
      useCartStore.getState().toggleWishlist('p-belgravia');
    });

    expect(screen.getByText(/removed from wishlist/i)).toBeInTheDocument();
  });
});
