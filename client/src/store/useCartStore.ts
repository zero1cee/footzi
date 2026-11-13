import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ShoeSize } from '@/types';
import { useAuthStore } from './useAuthStore';
import { cartService } from '@/services/cartService';
import { couponService, computeCouponDiscount, AppliedCoupon } from '@/services/couponService';
import { wishlistService } from '@/services/wishlistService';
import { isBackendUnreachable } from '@/lib/utils';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  wishlist: string[]; // product IDs
  quickViewProduct: Product | null;
  couponCode: string | null;
  coupon: AppliedCoupon | null;

  // Actions
  addItem: (product: Product, size: ShoeSize, color: string, colorHex: string, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  syncWithBackend: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  
  // Wishlist
  toggleWishlist: (productId: string) => void;
  /** Signed in: folds this device's hearts into the account's list and adopts the result. */
  syncWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;

  // Quick View
  setQuickViewProduct: (product: Product | null) => void;

  // Coupon
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  /** Rupees still needed before the applied coupon starts to apply (0 when it already does). */
  getCouponShortfall: () => number;

  // Calculations
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getShippingFee: () => number;
  getTotal: () => number;
  getTotalItemsCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      wishlist: [],
      quickViewProduct: null,
      couponCode: null,
      coupon: null,

      addItem: (product, size, color, colorHex, quantity = 1) => {
        const prodId = product.id || (product as any)._id || 'prod-default';
        const variant =
          product.variants?.find((v) => v.size === size && v.color === color) ||
          product.variants?.[0];
        const sku = variant ? variant.sku : `FTZ-${prodId}-${size}`;
        const itemId = `${prodId}-${sku}`;
        const stockLimit = variant ? variant.stock : 10;

        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((i) => i.id === itemId);

        if (existingIndex > -1) {
          const currentQty = currentItems[existingIndex].quantity;
          const nextQty = Math.min(currentQty + quantity, stockLimit);
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: nextQty,
          };
          set({ items: updated, isOpen: true });
        } else {
          const newItem: CartItem = {
            id: itemId,
            productId: prodId,
            productName: product.name,
            productSlug: product.slug,
            variantId: variant ? (variant.id || (variant as any)._id || 'v-default') : 'v-default',
            sku,
            size,
            color,
            colorHex,
            price: variant?.priceOverride ?? product.price,
            image: product.images?.[0] || '',
            quantity: Math.min(quantity, stockLimit),
            stock: stockLimit,
          };
          set({ items: [...currentItems, newItem], isOpen: true });
        }

        // Asynchronously sync with backend for authenticated patrons
        const token = useAuthStore.getState().token;
        if (token && !token.startsWith('demo-jwt-token')) {
          cartService
            .addItem(
              {
                productId: prodId,
                variantSku: sku,
                size,
                color,
                quantity,
              },
              token
            )
            .catch(() => {});
        }
      },

      removeItem: (itemId) => {
        const removed = get().items.find((i) => i.id === itemId);
        set({ items: get().items.filter((i) => i.id !== itemId) });
        const token = useAuthStore.getState().token;
        if (removed && token && !token.startsWith('demo-jwt-token')) {
          cartService.removeItem(removed.sku, token).catch(() => {});
        }
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === itemId ? { ...i, quantity: Math.min(quantity, i.stock) } : i
          ),
        });

        const updated = get().items.find((i) => i.id === itemId);
        const token = useAuthStore.getState().token;
        if (updated && token && !token.startsWith('demo-jwt-token')) {
          cartService.updateQuantity(updated.sku, updated.quantity, token).catch(() => {});
        }
      },

      clearCart: () => {
        set({ items: [] });
        const token = useAuthStore.getState().token;
        if (token && !token.startsWith('demo-jwt-token')) {
          cartService.clearCart(token).catch(() => {});
        }
      },

      syncWithBackend: async () => {
        const token = useAuthStore.getState().token;
        if (!token || token.startsWith('demo-jwt-token')) return;

        try {
          // Anything added as a guest (or on another device's stale copy) is merged into
          // the saved bag first, then the saved bag becomes the source of truth.
          const local = get().items.map((i) => ({
            productId: i.productId,
            variantSku: i.sku,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
          }));
          const serverCart =
            local.length > 0
              ? (await cartService.mergeItems(local, token)).cart
              : await cartService.getCart(token);

          if (serverCart && Array.isArray(serverCart.items)) {
            const mappedItems: CartItem[] = serverCart.items.map((si) => ({
              id: `${si.product}-${si.variantSku}`,
              productId: si.product,
              productName: si.productName,
              productSlug: si.productSlug,
              variantId: si.variantSku,
              sku: si.variantSku,
              size: si.size as ShoeSize,
              color: si.color,
              colorHex: si.colorHex || '#1C1C1C',
              price: si.unitPrice,
              image: si.image || '',
              quantity: si.quantity,
              stock: 10,
            }));
            set({ items: mappedItems });
          }
        } catch {
          // Keep local storage items if offline
        }
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),

      // The heart answers instantly. When signed in, the change is also saved to the account, and
      // if that fails the heart goes back to how it was, so it never claims something that was not saved.
      toggleWishlist: (productId) => {
        const before = get().wishlist;
        const adding = !before.includes(productId);
        set({ wishlist: adding ? [...before, productId] : before.filter((id) => id !== productId) });

        const token = useAuthStore.getState().token;
        if (!token || token.startsWith('demo-jwt-token')) return;
        (adding ? wishlistService.add(productId, token) : wishlistService.remove(productId, token)).catch(() => {
          const current = get().wishlist;
          set({ wishlist: adding ? current.filter((id) => id !== productId) : current.includes(productId) ? current : [...current, productId] });
        });
      },

      syncWishlist: async () => {
        const token = useAuthStore.getState().token;
        if (!token || token.startsWith('demo-jwt-token')) return;
        try {
          set({ wishlist: await wishlistService.merge(get().wishlist, token) });
        } catch {
          // Offline or the server is down: keep the local list and try again next time
        }
      },

      isInWishlist: (productId) => get().wishlist.includes(productId),

      setQuickViewProduct: (product) => set({ quickViewProduct: product }),

      // The server owns the rules (expiry, limits, first-order); the bag only shows the result
      applyCoupon: async (code) => {
        const subtotal = get().getSubtotal();
        if (subtotal <= 0) return { success: false, message: 'Add something to your bag first.' };
        try {
          const { discount: _preview, ...coupon } = await couponService.validate(code, subtotal, useAuthStore.getState().token);
          set({ couponCode: coupon.code, coupon });
          return { success: true, message: `${coupon.code} applied${coupon.description ? `: ${coupon.description}` : ''}.` };
        } catch (err: any) {
          return {
            success: false,
            message: isBackendUnreachable(err) ? "We couldn't check that code right now. Please try again." : err.message,
          };
        }
      },

      removeCoupon: () => set({ couponCode: null, coupon: null }),

      getCouponShortfall: () => {
        const { coupon } = get();
        const subtotal = get().getSubtotal();
        return coupon && subtotal > 0 ? Math.max(0, coupon.minOrderValue - subtotal) : 0;
      },

      getSubtotal: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },

      getDiscountAmount: () => {
        return computeCouponDiscount(get().coupon, get().getSubtotal());
      },

      getShippingFee: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0 || subtotal >= 1999) return 0;
        return 149;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0) return 0;
        const discount = get().getDiscountAmount();
        const shipping = get().getShippingFee();
        return Math.max(0, subtotal - discount + shipping);
      },

      getTotalItemsCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },
    }),
    {
      name: 'footzi-cart-storage',
      partialize: (state) => ({
        items: state.items,
        wishlist: state.wishlist,
        couponCode: state.couponCode,
        coupon: state.coupon,
      }),
      version: 2,
      // Version 1 stored a hard-coded percentage; those coupons are dropped and can be re-applied
      migrate: (persisted: any) => ({ ...persisted, couponCode: null, coupon: null }),
    }
  )
);

// Keep the bag in step with the session: signing in merges the guest bag into the
// saved one, and signing out (or switching accounts) clears it so one patron's bag
// never shows up for the next person on a shared device.
useAuthStore.subscribe((state, previous) => {
  if (state.token === previous.token) return;

  if (previous.token) {
    useCartStore.setState({ items: [], couponCode: null, coupon: null, wishlist: [] });
  }
  if (state.token) {
    void useCartStore.getState().syncWithBackend();
    void useCartStore.getState().syncWishlist();
  }
});
