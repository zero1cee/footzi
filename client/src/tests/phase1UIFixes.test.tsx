import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProductCard } from '@/components/ui/ProductCard';
import { QuickViewModal } from '@/components/common/QuickViewModal';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { useCartStore } from '@/store/useCartStore';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

describe('Phase 1 UI Interaction Fixes', () => {
  const sampleProduct = MOCK_PRODUCTS[0];

  it('ProductCard provides an accessible mobile touch trigger for Quick View', () => {
    render(
      <BrowserRouter>
        <ProductCard product={sampleProduct} />
      </BrowserRouter>
    );

    const mobileQuickViewBtn = screen.getByLabelText(`Quick view ${sampleProduct.name}`);
    expect(mobileQuickViewBtn).toBeInTheDocument();
    expect(mobileQuickViewBtn.classList.contains('sm:hidden')).toBe(true);
  });

  it('QuickViewModal has scrollable max-h-[90vh] container to prevent mobile screen clipping', () => {
    // Set active quick view product in store
    useCartStore.getState().setQuickViewProduct(sampleProduct);

    render(
      <BrowserRouter>
        <QuickViewModal />
      </BrowserRouter>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.className).toContain('max-h-[90vh]');
    expect(dialog.className).toContain('overflow-y-auto');

    // Clean up store
    useCartStore.getState().setQuickViewProduct(null);
  });

  it('CheckoutPage displays professional "2. Payment Method" heading and +91 phone prefix', () => {
    // Add item to cart so checkout form renders
    useCartStore.getState().addItem(sampleProduct, 'UK 8', sampleProduct.colors[0].name, sampleProduct.colors[0].hex, 1);

    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>
    );

    // Verify polished payment title
    expect(screen.getByText(/2\. Payment Method/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Encrypted/i)).toBeInTheDocument();

    // Verify +91 Indian mobile prefix
    expect(screen.getByText('+91')).toBeInTheDocument();
    const phoneInput = document.querySelector('input[name="phone"]') as HTMLInputElement;
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput.maxLength).toBe(10);

    // Clean up cart
    useCartStore.getState().clearCart();
  });
});
