import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { buildSitemap, escapeHtml, injectSeo, renderSeoBlock, robotsTxt, safeJson, seoForPath } from '../services/seoService.js';

const app = createApp();
const stamp = Date.now();
const BASE = 'https://shop.example';
const hasClient = fs.existsSync(path.resolve(__dirname, '../../../client/dist/index.html'));

describe('SEO', () => {
  const slug = `seo-test-boot-${stamp}`;
  const archivedSlug = `seo-archived-${stamp}`;
  const hostileName = `Seo "Test" <Boot> & Co ${stamp}`;
  const ids: string[] = [];

  const makeProduct = async (over: Record<string, unknown>) => {
    const p = await Product.create({
      name: 'Seo Test Boot',
      slug,
      description: 'A hand-stitched test boot with a cushioned insole and a resoleable Blake construction.',
      category: 'Boots',
      price: 4200,
      originalPrice: 5000,
      images: ['/images/products/test.jpg', 'https://cdn.example/second.jpg'],
      colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }],
      sizes: ['UK 8'],
      variants: [{ sku: `SEO-${stamp}-${String(over.slug ?? slug).slice(-4)}`, size: 'UK 8', color: 'Tan', colorHex: '#8C4E28', stock: 5 }],
      reviewCount: 3,
      rating: 4.5,
      ...over,
    });
    ids.push(p.id);
    return p;
  };

  beforeAll(async () => {
    await connectDB();
    await makeProduct({ name: hostileName });
    await makeProduct({ slug: archivedSlug, name: 'Seo Archived Boot', isActive: false });
  });

  afterAll(async () => {
    await Product.deleteMany({ _id: { $in: ids } });
    await mongoose.connection.close();
  });

  describe('building blocks', () => {
    it('escapes everything that goes into a tag, and keeps JSON from closing its script', () => {
      expect(escapeHtml(`"><script>alert('x')</script>&`)).toBe('&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;');
      const json = safeJson({ name: '</script><b>' });
      expect(json).not.toContain('<');
      expect(JSON.parse(json).name).toBe('</script><b>');
    });

    it('renders a complete, escaped block and swaps it into the template', () => {
      const block = renderSeoBlock({ title: 'A "title"', description: 'desc', url: `${BASE}/x`, image: `${BASE}/i.jpg`, noindex: true, jsonLd: { n: 1 } });
      expect(block).toContain('<title>A &quot;title&quot;</title>');
      expect(block).toContain('<meta name="robots" content="noindex, nofollow" />');
      expect(block).toContain(`<link rel="canonical" href="${BASE}/x" />`);
      expect(block).toContain(`<meta property="og:image" content="${BASE}/i.jpg" />`);
      expect(block).toContain('twitter:card" content="summary_large_image"');
      expect(block).toContain('<script type="application/ld+json" id="seo-jsonld">{"n":1}</script>');

      const template = '<head><!--seo:start--><title>Old</title><!--seo:end--></head>';
      const out = injectSeo(template, { title: 'New $& title', description: 'd', url: BASE });
      expect(out).toContain('<title>New $&amp; title</title>');
      expect(out).not.toContain('Old');
    });

    it('robots keeps private pages and the API out, and points at the sitemap', () => {
      const robots = robotsTxt(BASE);
      for (const p of ['/api/', '/admin', '/account', '/checkout', '/cart']) expect(robots).toContain(`Disallow: ${p}`);
      expect(robots).toContain(`Sitemap: ${BASE}/sitemap.xml`);
    });
  });

  describe('page tags', () => {
    it('gives a product its own title, description, image, price and availability', async () => {
      const { seo, status } = await seoForPath(`/product/${slug}`, BASE);
      expect(status).toBe(200);
      expect(seo.title).toBe(`${hostileName} — Footzi`);
      expect(seo.description.length).toBeLessThanOrEqual(160);
      expect(seo.image).toBe(`${BASE}/images/products/test.jpg`); // relative paths become absolute
      expect(seo.type).toBe('product');
      const ld = seo.jsonLd as any;
      expect(ld['@type']).toBe('Product');
      expect(ld.offers).toMatchObject({ priceCurrency: 'INR', price: 4200, availability: 'https://schema.org/InStock' });
      expect(ld.image).toEqual([`${BASE}/images/products/test.jpg`, 'https://cdn.example/second.jpg']);
      expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 3 });
    });

    it('reports a retired or unknown style as a real 404 that search engines should drop', async () => {
      for (const missing of [archivedSlug, `no-such-style-${stamp}`]) {
        const { seo, status } = await seoForPath(`/product/${missing}`, BASE);
        expect(status).toBe(404);
        expect(seo.noindex).toBe(true);
        expect(seo.jsonLd).toBeUndefined();
      }
    });

    it('keeps private pages out of search results and answers unknown addresses with 404', async () => {
      for (const p of ['/cart', '/checkout', '/account/orders', '/admin', '/login', '/wishlist']) {
        const { seo, status } = await seoForPath(p, BASE);
        expect([p, status, seo.noindex]).toEqual([p, 200, true]);
      }
      expect((await seoForPath('/shop', BASE)).seo.noindex).toBeFalsy();
      expect((await seoForPath('/brand-story', BASE)).status).toBe(200);
      expect((await seoForPath('/definitely/not/a/page', BASE)).status).toBe(404);
    });
  });

  describe('sitemap', () => {
    it('lists the public pages and active products, never archived ones', async () => {
      const xml = await buildSitemap(BASE);
      expect(xml).toContain(`<loc>${BASE}/</loc>`);
      expect(xml).toContain(`<loc>${BASE}/shop</loc>`);
      expect(xml).toContain(`<loc>${BASE}/product/${slug}</loc>`);
      expect(xml).not.toContain(archivedSlug);
      expect(xml).not.toContain('/admin');
      expect(xml).not.toContain('/cart');
    });
  });

  describe('over HTTP', () => {
    it('serves robots.txt and sitemap.xml with the right types and the host they were asked on', async () => {
      const robots = await request(app).get('/robots.txt').set('Host', 'shop.example');
      expect(robots.status).toBe(200);
      expect(robots.headers['content-type']).toMatch(/text\/plain/);
      expect(robots.text).toMatch(/Sitemap: https?:\/\/shop\.example\/sitemap\.xml/);

      const sitemap = await request(app).get('/sitemap.xml').set('Host', 'shop.example');
      expect(sitemap.status).toBe(200);
      expect(sitemap.headers['content-type']).toMatch(/application\/xml/);
      expect(sitemap.text).toContain(`/product/${slug}`);
    });

    it.skipIf(!hasClient)('delivers each page with its own tags in the very first response', async () => {
      const product = await request(app).get(`/product/${slug}`).set('Host', 'shop.example');
      expect(product.status).toBe(200);
      expect(product.headers['content-type']).toMatch(/text\/html/);
      expect(product.text).toContain(`<title>${escapeHtml(hostileName)} — Footzi</title>`);
      expect(product.text).toContain('property="og:image"');
      expect(product.text).toContain('application/ld+json');
      // The product name has quotes and angle brackets; none may reach the page unescaped
      expect(product.text).not.toContain(hostileName);
      expect((product.text.match(/<title>/g) || []).length).toBe(1);
      expect(product.text).toContain('<div id="root">');

      const gone = await request(app).get(`/product/${archivedSlug}`);
      expect(gone.status).toBe(404);
      expect(gone.text).toContain('noindex');
      expect(gone.text).toContain('<div id="root">'); // the app still loads and shows its own message

      const cart = await request(app).get('/cart');
      expect(cart.status).toBe(200);
      expect(cart.text).toContain('content="noindex, nofollow"');

      const home = await request(app).get('/');
      expect(home.text).not.toContain('noindex');
      expect(home.text).toContain('rel="canonical"');
    });

    it('keeps unknown API routes as JSON 404s, not HTML', async () => {
      const res = await request(app).get('/api/nope');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/json/);
    });
  });
});
