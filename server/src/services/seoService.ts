import { Request } from 'express';
import { Product } from '../models/Product.js';

/** Public origin of the site. APP_URL wins, then Render's URL, then whatever the request came in on. */
export const publicBaseUrl = (req: Request): string =>
  (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

const SITE_NAME = 'Footzi';
const DEFAULT_TITLE = 'FOOTZI — Architectural Footwear & Leathercraft';
const DEFAULT_DESCRIPTION =
  "Footzi — Premium handcrafted footwear inspired by modern minimalism and Agra's architectural heritage. Made for discerning modern India.";

export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** JSON that is safe to place inside a <script> tag: "</script>" in a product name cannot end the tag early. */
export const safeJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028|\u2029/g, '');

const trimTo = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
};

const absolute = (base: string, url: string): string => (/^https?:\/\//.test(url) ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`);

export interface PageSeo {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

/** The tags that go between the seo markers in index.html. Everything is escaped. */
export const renderSeoBlock = (seo: PageSeo): string => {
  const lines = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(seo.url)}" />`,
    seo.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${seo.type === 'product' ? 'product' : 'website'}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.url)}" />`,
    seo.image ? `<meta property="og:image" content="${escapeHtml(seo.image)}" />` : '',
    `<meta name="twitter:card" content="${seo.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    seo.image ? `<meta name="twitter:image" content="${escapeHtml(seo.image)}" />` : '',
    seo.jsonLd ? `<script type="application/ld+json" id="seo-jsonld">${safeJson(seo.jsonLd)}</script>` : '',
  ];
  return lines.filter(Boolean).join('\n    ');
};

const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;

/** Swaps the default tags in index.html for this page's. Also drops the static <title>, which the block replaces. */
export const injectSeo = (template: string, seo: PageSeo): string =>
  template
    .replace(SEO_BLOCK, () => `<!--seo:start-->\n    ${renderSeoBlock(seo)}\n    <!--seo:end-->`);

// Pages that belong to one customer or to staff are kept out of search results
const PRIVATE_PREFIXES = ['/account', '/admin', '/checkout', '/cart', '/login', '/register', '/forgot-password', '/reset-password', '/wishlist'];

const STATIC_PAGES: Record<string, { title: string; description: string }> = {
  '/shop': {
    title: 'Shop Handcrafted Leather Footwear — Footzi',
    description: 'Loafers, sneakers, oxfords, boots and slip-ons handcrafted in Agra from full-grain leather. Free delivery over ₹1,999 and 7-day size exchange.',
  },
  '/size-guide': {
    title: 'Size Guide — Footzi',
    description: 'Find your UK size with the Footzi size guide: foot length chart, fit notes for every silhouette and how to measure at home.',
  },
  '/leather-care': {
    title: 'Leather Care Guide — Footzi',
    description: 'How to clean, condition and store full-grain leather footwear so your Footzi pair keeps its patina for years.',
  },
};

export interface SeoResult {
  seo: PageSeo;
  status: number;
}

/** Works out the tags (and status code) for a page address. Unknown product addresses are real 404s, not soft ones. */
export const seoForPath = async (pathname: string, base: string): Promise<SeoResult> => {
  const url = `${base}${pathname === '/' ? '' : pathname.replace(/\/$/, '')}`;
  const home: PageSeo = { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, url: url || base, type: 'website' };

  const productMatch = pathname.match(/^\/product\/([a-z0-9-]+)\/?$/i);
  if (productMatch) {
    const product = await Product.findOne({ slug: productMatch[1].toLowerCase(), isActive: true }).lean();
    if (!product) {
      return { status: 404, seo: { ...home, title: `Product not found — ${SITE_NAME}`, description: 'This style is no longer available.', noindex: true } };
    }
    const image = product.images?.[0] ? absolute(base, product.images[0]) : undefined;
    const inStock = (product.variants || []).some((v) => v.stock > 0);
    const description = trimTo(`${product.name}. ${product.description}`, 160);
    return {
      status: 200,
      seo: {
        title: `${product.name} — ${SITE_NAME}`,
        description,
        url,
        image,
        type: 'product',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: trimTo(product.description, 500),
          image: (product.images || []).map((i) => absolute(base, i)),
          sku: product.variants?.[0]?.sku,
          category: product.category,
          brand: { '@type': 'Brand', name: product.brand || 'Footzi Atelier' },
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'INR',
            price: product.price,
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
          },
          ...(product.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
        },
      },
    };
  }

  if (PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return { status: 200, seo: { ...home, title: `${SITE_NAME}`, noindex: true } };
  }

  const known = STATIC_PAGES[pathname.replace(/\/$/, '')];
  if (known) return { status: 200, seo: { ...home, ...known } };

  // /brand-story is a redirect to the home page's heritage section
  if (pathname === '/' || pathname === '' || pathname === '/brand-story') return { status: 200, seo: home };

  // The client renders its own "not found" page; the status and tags say so too
  return { status: 404, seo: { ...home, title: `Page not found — ${SITE_NAME}`, noindex: true } };
};

export const robotsTxt = (base: string): string =>
  ['User-agent: *', 'Disallow: /api/', ...PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`), '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n');

const xml = (s: string): string => escapeHtml(s);

export const buildSitemap = async (base: string): Promise<string> => {
  const products = await Product.find({ isActive: true }).select('slug updatedAt').sort({ updatedAt: -1 }).limit(5000).lean();
  const entries = [
    { loc: `${base}/`, priority: '1.0' },
    ...Object.keys(STATIC_PAGES).map((p) => ({ loc: `${base}${p}`, priority: '0.7' })),
    ...products.map((p) => ({ loc: `${base}/product/${p.slug}`, lastmod: new Date(p.updatedAt).toISOString().slice(0, 10), priority: '0.8' })),
  ];
  const body = entries
    .map((e) => `  <url><loc>${xml(e.loc)}</loc>${'lastmod' in e ? `<lastmod>${e.lastmod}</lastmod>` : ''}<priority>${e.priority}</priority></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};
