import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TrustFeatures } from '@/components/home/TrustFeatures';
import { AgraHeritageBanner } from '@/components/home/AgraHeritageBanner';
import { Footer } from '@/components/common/Footer';
import { Navbar } from '@/components/common/Navbar';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductListingPage } from '@/pages/ProductListingPage';
import { useAuthStore } from '@/store/useAuthStore';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

const renderWithProviders = (ui: React.ReactElement, initialEntries = ['/']) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Business-Ready Storefront UI/UX Audit & Polish', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('removes dev/simulation/dropship jargon from TrustFeatures, AgraHeritageBanner, and Footer', () => {
    const { container } = renderWithProviders(
      <>
        <TrustFeatures />
        <AgraHeritageBanner />
        <Footer />
      </>
    );

    const text = container.textContent?.toLowerCase() || '';
    expect(text).not.toContain('dropship');
    expect(text).not.toContain('simulated dispatch');
    expect(text).not.toContain('simulated tracking');
    expect(screen.getAllByText(/Express Courier/i).length).toBeGreaterThanOrEqual(1);
  });

  it('keeps Admin links hidden from public shoppers in Footer and Mobile Navbar', () => {
    renderWithProviders(
      <>
        <Navbar />
        <Footer />
      </>
    );

    // Public shopper: no admin portal links exposed
    expect(screen.queryByText(/Admin & Supplier Portal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Admin Control Deck/i)).not.toBeInTheDocument();

    // Open mobile menu as non-admin shopper
    const menuBtn = screen.getByLabelText(/open mobile menu/i);
    fireEvent.click(menuBtn);
    expect(screen.queryByText(/Admin Control Panel/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Admin Control Deck/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Sign In \/ Register/i)).toBeInTheDocument();
  });

  it('reveals Admin Control Deck in Footer & Mobile Navbar for authenticated admin accounts', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'admin-token',
      user: {
        id: 'admin-1',
        name: 'Store Director',
        email: 'director@footzi.in',
        role: 'admin',
        addresses: [],
      },
    });

    renderWithProviders(
      <>
        <Navbar />
        <Footer />
      </>
    );

    expect(screen.getByText(/Admin Control Deck/i)).toBeInTheDocument();

    const menuBtn = screen.getByLabelText(/open mobile menu/i);
    fireEvent.click(menuBtn);
    expect(screen.getAllByText(/Admin Control Deck/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays actionable AGRAFIRST code in Footer newsletter confirmation', () => {
    renderWithProviders(<Footer />);
    const emailInput = screen.getByPlaceholderText(/Enter your email address/i);
    fireEvent.change(emailInput, { target: { value: 'patron@footzi.in' } });
    fireEvent.click(screen.getByLabelText(/Subscribe/i));

    expect(screen.getByText(/Welcome to Footzi Privé/i)).toBeInTheDocument();
    expect(screen.getByText(/AGRAFIRST/)).toBeInTheDocument();
  });

  it('ProductCard provides accessible swatch aria-labels and clean fallback when reviewCount is 0', () => {
    const newProduct = {
      ...MOCK_PRODUCTS[0],
      rating: 0,
      reviewCount: 0,
    };

    renderWithProviders(<ProductCard product={newProduct} />);
    expect(screen.getByText(/Atelier Edit/i)).toBeInTheDocument();
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();

    if (newProduct.colors.length > 0) {
      expect(screen.getByLabelText(`Preview ${newProduct.colors[0].name} shade`)).toBeInTheDocument();
    }
  });

  it('ProductListingPage mobile filter drawer includes full parity (Leather Shades, Price Range, Footzi Line, In-Stock)', () => {
    renderWithProviders(<ProductListingPage />);

    const filtersBtn = screen.getByRole('button', { name: /Filters/i });
    fireEvent.click(filtersBtn);

    expect(screen.getByText(/Refine Catalog/i)).toBeInTheDocument();
    // Both desktop aside & mobile drawer have these headings -> verify multiple instances or presence inside mobile overlay
    expect(screen.getAllByText(/Leather Shades/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Price Range/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Footzi Line/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/In-Stock Only/i).length).toBeGreaterThanOrEqual(2);
  });
});
