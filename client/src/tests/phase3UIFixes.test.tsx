import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { QuickViewModal } from '@/components/common/QuickViewModal';
import { useCartStore } from '@/store/useCartStore';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

describe('Phase 3 UI: Image Lightbox & Leather Craftsmanship Inspection', () => {
  const sampleImages = [
    'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4',
    'https://images.unsplash.com/photo-1533867617858-e7b97e060509',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772',
  ];

  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('ImageLightbox renders in fullscreen with title, counter, craftsmanship detail and thumbnails', () => {
    const handleClose = vi.fn();
    const handleIndexChange = vi.fn();

    render(
      <ImageLightbox
        isOpen={true}
        onClose={handleClose}
        images={sampleImages}
        currentIndex={0}
        onIndexChange={handleIndexChange}
        productName="The Agra Belgravia Penny Loafer"
        craftsmanshipDetail="Full-Grain Vegetable Tanned Leather"
      />
    );

    expect(screen.getByRole('dialog', { name: /fullscreen craftsmanship view/i })).toBeInTheDocument();
    expect(screen.getByText('The Agra Belgravia Penny Loafer')).toBeInTheDocument();
    expect(screen.getByText('Full-Grain Vegetable Tanned Leather')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument(); // Initial 1x zoom

    // Next button advances perspective
    const nextBtn = screen.getByRole('button', { name: /next image/i });
    fireEvent.click(nextBtn);
    expect(handleIndexChange).toHaveBeenCalledWith(1);

    // Prev button wraps to last perspective
    const prevBtn = screen.getByRole('button', { name: /previous image/i });
    fireEvent.click(prevBtn);
    expect(handleIndexChange).toHaveBeenCalledWith(2);

    // Close button triggers onClose
    const closeBtn = screen.getByRole('button', { name: /close image viewer/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('ImageLightbox supports zoom in, zoom out, reset, and keyboard escape', () => {
    const handleClose = vi.fn();
    const handleIndexChange = vi.fn();

    render(
      <ImageLightbox
        isOpen={true}
        onClose={handleClose}
        images={sampleImages}
        currentIndex={1}
        onIndexChange={handleIndexChange}
        productName="The Agra Belgravia Penny Loafer"
      />
    );

    const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
    const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });

    // Initial zoom 100%
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Zoom in
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('150%')).toBeInTheDocument();

    // Reset zoom button appears when zoomed
    const resetBtn = screen.getByRole('button', { name: /reset zoom/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Keyboard navigation: Escape closes lightbox
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();

    // Keyboard navigation: ArrowRight triggers next
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(handleIndexChange).toHaveBeenCalledWith(2);
  });

  it('ProductDetailPage allows opening fullscreen lightbox via "Inspect" button', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/product/agra-belgravia-penny-loafer']}>
          <Routes>
            <Route path="/product/:slug" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Find Inspect button on PDP
    const inspectBtn = await screen.findByRole('button', { name: /inspect craftsmanship/i });
    expect(inspectBtn).toBeInTheDocument();
    expect(inspectBtn).toHaveTextContent('Inspect');

    // Click to open lightbox
    act(() => {
      fireEvent.click(inspectBtn);
    });

    expect(screen.getByRole('dialog', { name: /fullscreen craftsmanship view/i })).toBeInTheDocument();
  });

  it('QuickViewModal allows opening fullscreen lightbox to inspect craftsmanship', () => {
    const testShoe = MOCK_PRODUCTS[0];
    useCartStore.setState({ quickViewProduct: testShoe });

    render(
      <MemoryRouter>
        <QuickViewModal />
      </MemoryRouter>
    );

    const zoomBtn = screen.getByRole('button', { name: /inspect craftsmanship/i });
    expect(zoomBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(zoomBtn);
    });

    expect(screen.getByRole('dialog', { name: /fullscreen craftsmanship view/i })).toBeInTheDocument();

    // Clean up
    useCartStore.setState({ quickViewProduct: null });
  });
});
