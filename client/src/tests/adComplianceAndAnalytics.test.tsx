import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsPage } from '@/pages/TermsPage';
import { ShippingPolicyPage } from '@/pages/ShippingPolicyPage';
import { RefundPolicyPage } from '@/pages/RefundPolicyPage';
import { ContactUsPage } from '@/pages/ContactUsPage';
import { Footer } from '@/components/common/Footer';
import {
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
} from '@/lib/analytics';

describe('Ad Compliance & Legal Policies (Meta / Google Ad Readiness)', () => {
  it('renders Privacy Policy with IT Act 2000 and Razorpay security compliance', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Information Technology Act, 2000/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Zero Card Storage Guarantee/i)).toBeInTheDocument();
  });

  it('renders Terms of Service with Agra leathercraft and HSN 6403 GST details', () => {
    render(<TermsPage />);
    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByText(/HSN 6403/i)).toBeInTheDocument();
    expect(screen.getByText(/Natural Leather Characteristic Notice/i)).toBeInTheDocument();
  });

  it('renders Shipping Policy with Delhivery Express SLA and tracking', () => {
    render(<ShippingPolicyPage />);
    expect(screen.getByRole('heading', { name: /shipping & delivery policy/i })).toBeInTheDocument();
    expect(screen.getByText(/Delhivery Express Logistics/i)).toBeInTheDocument();
    expect(screen.getByText(/2 to 4 Days/i)).toBeInTheDocument();
  });

  it('renders Refund & Exchange Policy with Delhivery reverse pickup', () => {
    render(<RefundPolicyPage />);
    expect(screen.getByRole('heading', { name: /return, exchange & refund policy/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Size Exchange/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prepaid Orders \(Razorpay\)/i)).toBeInTheDocument();
  });

  it('renders Contact Us page with Taj Nagari Agra atelier and statutory Grievance Officer', () => {
    render(<ContactUsPage />);
    expect(screen.getByRole('heading', { name: /contact & grievance desk/i })).toBeInTheDocument();
    expect(screen.getByText(/Taj Nagari Phase II/i)).toBeInTheDocument();
    expect(screen.getByText(/Statutory E-Commerce Grievance Officer/i)).toBeInTheDocument();
  });

  it('Footer renders prominent links to all 5 statutory ad compliance pages', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    const privacyLinks = screen.getAllByRole('link', { name: /privacy policy/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(privacyLinks.some((l) => l.getAttribute('href') === '/privacy-policy')).toBe(true);

    const termsLink = screen.getByRole('link', { name: /terms of service/i });
    expect(termsLink).toHaveAttribute('href', '/terms');

    const shippingLink = screen.getByRole('link', { name: /shipping & delivery/i });
    expect(shippingLink).toHaveAttribute('href', '/shipping-policy');

    const refundLink = screen.getByRole('link', { name: /return & refund policy/i });
    expect(refundLink).toHaveAttribute('href', '/refund-policy');

    const grievanceLink = screen.getByRole('link', { name: /grievance officer/i });
    expect(grievanceLink).toHaveAttribute('href', '/contact');
  });
});

describe('Ad Attribution & Conversion Tracking Engine (Meta Pixel & GA4)', () => {
  beforeEach(() => {
    window.fbq = vi.fn();
    window.gtag = vi.fn();
  });

  it('safely runs trackPageView without errors', () => {
    expect(() => trackPageView('/shop', 'Footzi Collections')).not.toThrow();
  });

  it('safely runs trackViewContent without errors', () => {
    expect(() =>
      trackViewContent({
        id: 'p1',
        name: 'The Agra Loafer',
        price: 4999,
        category: 'Loafers',
      })
    ).not.toThrow();
  });

  it('safely runs trackAddToCart without errors', () => {
    expect(() =>
      trackAddToCart({
        id: 'p1',
        name: 'The Agra Loafer',
        price: 4999,
        size: 'UK 8',
        color: 'Sienna',
        quantity: 1,
      })
    ).not.toThrow();
  });

  it('safely runs trackInitiateCheckout without errors', () => {
    expect(() =>
      trackInitiateCheckout({
        items: [{ id: 'p1', name: 'The Agra Loafer', price: 4999, quantity: 1 }],
        totalValue: 4999,
      })
    ).not.toThrow();
  });

  it('safely runs trackPurchase without errors', () => {
    expect(() =>
      trackPurchase({
        orderNumber: 'FTZ-2024-9999',
        total: 4999,
        items: [{ id: 'p1', name: 'The Agra Loafer', unitPrice: 4999, quantity: 1 }],
      })
    ).not.toThrow();
  });
});
