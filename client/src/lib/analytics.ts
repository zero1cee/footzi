/**
 * Footzi Ad Attribution & Conversion Tracking Engine
 *
 * Supports:
 * - Meta Pixel (Facebook / Instagram Ads) via `fbq`
 * - Google Analytics 4 & Google Ads Conversion via `gtag`
 *
 * Configured dynamically via environment variables:
 * - VITE_META_PIXEL_ID (e.g. 123456789012345)
 * - VITE_GA4_MEASUREMENT_ID (e.g. G-XXXXXXXXXX)
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const META_PIXEL_ID = (import.meta as any).env?.VITE_META_PIXEL_ID;
const GA4_MEASUREMENT_ID = (import.meta as any).env?.VITE_GA4_MEASUREMENT_ID;

let metaPixelInitialized = false;
let ga4Initialized = false;

/**
 * Initializes Meta Pixel script into DOM once.
 */
export function initMetaPixel(): void {
  if (typeof window === 'undefined' || metaPixelInitialized || !META_PIXEL_ID) {
    return;
  }

  try {
    if (!window.fbq) {
      const fbq: any = function (...args: any[]) {
        if (fbq.callMethod) {
          fbq.callMethod.apply(fbq, args);
        } else {
          fbq.queue.push(args);
        }
      };
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }

    if (window.fbq) {
      window.fbq('init', META_PIXEL_ID);
      metaPixelInitialized = true;
    }
  } catch (err) {
    console.warn('[Footzi Analytics] Meta Pixel init skipped:', err);
  }
}

/**
 * Initializes Google Tag / GA4 into DOM once.
 */
export function initGA4(): void {
  if (typeof window === 'undefined' || ga4Initialized || !GA4_MEASUREMENT_ID) {
    return;
  }

  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer?.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA4_MEASUREMENT_ID, { send_page_view: false });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    ga4Initialized = true;
  } catch (err) {
    console.warn('[Footzi Analytics] GA4 init skipped:', err);
  }
}

/**
 * Track route / page view on navigation
 */
export function trackPageView(path = window.location.pathname, title = document.title): void {
  if (typeof window === 'undefined') return;

  if (window.fbq && META_PIXEL_ID) {
    window.fbq('track', 'PageView');
  }

  if (window.gtag && GA4_MEASUREMENT_ID) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
    });
  }
}

/**
 * Track product view event (Meta: ViewContent, GA4: view_item)
 */
export function trackViewContent(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}): void {
  if (typeof window === 'undefined') return;

  if (window.fbq && META_PIXEL_ID) {
    window.fbq('track', 'ViewContent', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });
  }

  if (window.gtag && GA4_MEASUREMENT_ID) {
    window.gtag('event', 'view_item', {
      currency: 'INR',
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
        },
      ],
    });
  }
}

/**
 * Track Add to Cart event (Meta: AddToCart, GA4: add_to_cart)
 */
export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  size?: string;
  color?: string;
  quantity?: number;
}): void {
  if (typeof window === 'undefined') return;
  const qty = item.quantity || 1;
  const lineValue = item.price * qty;

  if (window.fbq && META_PIXEL_ID) {
    window.fbq('track', 'AddToCart', {
      content_name: item.name,
      content_ids: [item.id],
      content_type: 'product',
      value: lineValue,
      currency: 'INR',
    });
  }

  if (window.gtag && GA4_MEASUREMENT_ID) {
    window.gtag('event', 'add_to_cart', {
      currency: 'INR',
      value: lineValue,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: qty,
          item_variant: `${item.color || ''} ${item.size || ''}`.trim(),
        },
      ],
    });
  }
}

/**
 * Track Initiate Checkout event (Meta: InitiateCheckout, GA4: begin_checkout)
 */
export function trackInitiateCheckout(cart: {
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  totalValue: number;
}): void {
  if (typeof window === 'undefined') return;

  if (window.fbq && META_PIXEL_ID) {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: cart.items.map((i) => i.id),
      content_type: 'product',
      num_items: cart.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0),
      value: cart.totalValue,
      currency: 'INR',
    });
  }

  if (window.gtag && GA4_MEASUREMENT_ID) {
    window.gtag('event', 'begin_checkout', {
      currency: 'INR',
      value: cart.totalValue,
      items: cart.items.map((i) => ({
        item_id: i.id,
        item_name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    });
  }
}

/**
 * Track Purchase event (Meta: Purchase, GA4: purchase)
 */
export function trackPurchase(order: {
  orderNumber: string;
  total: number;
  items: Array<{ id?: string; sku?: string; name: string; unitPrice: number; quantity: number }>;
}): void {
  if (typeof window === 'undefined') return;

  if (window.fbq && META_PIXEL_ID) {
    window.fbq('track', 'Purchase', {
      content_ids: order.items.map((i) => i.id || i.sku || i.name),
      content_type: 'product',
      num_items: order.items.reduce((acc, curr) => acc + curr.quantity, 0),
      value: order.total,
      currency: 'INR',
      order_id: order.orderNumber,
    });
  }

  if (window.gtag && GA4_MEASUREMENT_ID) {
    window.gtag('event', 'purchase', {
      transaction_id: order.orderNumber,
      value: order.total,
      currency: 'INR',
      items: order.items.map((i) => ({
        item_id: i.id || i.sku,
        item_name: i.name,
        price: i.unitPrice,
        quantity: i.quantity,
      })),
    });
  }
}
