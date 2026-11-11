import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ShoeSize } from '@/types';
import { useAuthStore } from './useAuthStore';
import { cartService } from '@/services/cartService';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  wishlist: string[]; // product IDs
  quickViewProduct: Product | null;
  couponCode: string | null;
  discountRate: number; // e.g. 0.10 for 10%

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
  isInWishlist: (productId: string) => boolean;

  // Quick View
  setQuickViewProduct: (product: Product | null) => void;

  // Coupon
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;

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
      discountRate: 0,

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
          const serverCart = await cartService.getCart(token);
          if (serverCart && Array.isArray(serverCart.items) && serverCart.items.length > 0) {
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

      toggleWishlist: (productId) => {
        const list = get().wishlist;
        if (list.includes(productId)) {
          set({ wishlist: list.filter((id) => id !== productId) });
        } else {
          set({ wishlist: [...list, productId] });
        }
      },

      isInWishlist: (productId) => get().wishlist.includes(productId),

      setQuickViewProduct: (product) => set({ quickViewProduct: product }),

      applyCoupon: (code) => {
        const cleanCode = code.trim().toUpperCase();
        if (cleanCode === 'FOOTZI10') {
          set({ couponCode: 'FOOTZI10', discountRate: 0.1 });
          return { success: true, message: 'Coupon applied! 10% discount on order.' };
        } else if (cleanCode === 'AGRAFIRST') {
          set({ couponCode: 'AGRAFIRST', discountRate: 0.15 });
          return { success: true, message: 'Special Welcome Offer: 15% discount applied!' };
        }
        return { success: false, message: 'Invalid or expired coupon code. Try FOOTZI10.' };
      },

      removeCoupon: () => set({ couponCode: null, discountRate: 0 }),

      getSubtotal: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },

      getDiscountAmount: () => {
        const subtotal = get().getSubtotal();
        return Math.round(subtotal * get().discountRate);
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
        discountRate: state.discountRate,
      }),
    }
  )
);
