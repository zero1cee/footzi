import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CartDrawer } from '../components/common/CartDrawer';
import { QuickViewModal } from '../components/common/QuickViewModal';
import { SizeGuideModal } from '../components/common/SizeGuideModal';
import { useCartStore } from '../store/useCartStore';
import { MOCK_PRODUCTS } from '../data/mockProducts';

expect.extend(toHaveNoViolations);

const withRouter = (ui: React.ReactElement) => <MemoryRouter>{ui}</MemoryRouter>;

describe('dialogs are usable without a mouse', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    useCartStore.setState({ items: [], isOpen: false, quickViewProduct: null, couponCode: null, coupon: null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('the bag drawer announces itself, takes focus, closes on Escape and gives focus back', () => {
    render(
      withRouter(
        <>
          <button>Open bag</button>
          <CartDrawer />
        </>
      )
    );
    const opener = screen.getByRole('button', { name: 'Open bag' });
    opener.focus();

    act(() => useCartStore.getState().openCart());
    const dialog = screen.getByRole('dialog', { name: 'Shopping bag' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useCartStore.getState().isOpen).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps Tab and Shift+Tab inside the open drawer', () => {
    render(withRouter(<CartDrawer />));
    act(() => useCartStore.getState().openCart());
    const dialog = screen.getByRole('dialog');
    const items = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
    expect(items.length).toBeGreaterThan(1);

    items[items.length - 1].focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('quick view is a labelled dialog that Escape closes', async () => {
    const product = MOCK_PRODUCTS[0];
    const { container } = render(withRouter(<QuickViewModal />));
    act(() => useCartStore.getState().setQuickViewProduct(product));

    const dialog = screen.getByRole('dialog', { name: `Quick view: ${product.name}` });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useCartStore.getState().quickViewProduct).toBeNull();
  });

  it('the size guide closes on Escape and has no detectable violations', async () => {
    const onClose = vi.fn();
    const { container } = render(<SizeGuideModal isOpen onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: /size conversion/i })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the open bag with items has no detectable violations', async () => {
    useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
    const { container } = render(withRouter(<CartDrawer />));
    act(() => useCartStore.getState().openCart());
    expect(await axe(container)).toHaveNoViolations();
  });
});
