import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard } from '../components/ui/ProductCard';
import { MOCK_PRODUCTS } from '../data/mockProducts';
import { useCartStore } from '../store/useCartStore';

describe('ProductCard Component', () => {
  const sampleProduct = MOCK_PRODUCTS[0];

  it('renders product information accurately', () => {
    render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} />
      </MemoryRouter>
    );

    // Title
    expect(screen.getByText(sampleProduct.name)).toBeInTheDocument();
    // Category
    expect(screen.getByText(sampleProduct.category)).toBeInTheDocument();
    // Rating
    expect(screen.getByText(sampleProduct.rating.toString())).toBeInTheDocument();
    // Subtitle
    expect(screen.getByText(sampleProduct.subtitle)).toBeInTheDocument();
  });

  it('triggers quick view modal on click', () => {
    render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} />
      </MemoryRouter>
    );

    const quickViewBtn = screen.getByText(/quick view/i);
    fireEvent.click(quickViewBtn);

    const activeQuickView = useCartStore.getState().quickViewProduct;
    expect(activeQuickView?.id).toBe(sampleProduct.id);
  });
});
