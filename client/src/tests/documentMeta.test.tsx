import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useDocumentMeta, DEFAULT_TITLE, DocumentMeta } from '../hooks/useDocumentMeta';

const Page = (props: { meta: DocumentMeta }) => {
  useDocumentMeta(props.meta);
  return null;
};

const meta = (selector: string) => document.head.querySelector(selector)?.getAttribute('content') ?? null;

describe('useDocumentMeta', () => {
  afterEach(() => {
    document.head.querySelectorAll('meta[name], meta[property], link[rel="canonical"], script#seo-jsonld').forEach((el) => el.remove());
    document.title = '';
  });

  it('sets the title, description, share tags and canonical link for a page', () => {
    render(<Page meta={{ title: 'Loafers — Footzi', description: 'Hand stitched loafers', image: 'https://cdn.example/a.jpg', type: 'product' }} />);

    expect(document.title).toBe('Loafers — Footzi');
    expect(meta('meta[name="description"]')).toBe('Hand stitched loafers');
    expect(meta('meta[property="og:title"]')).toBe('Loafers — Footzi');
    expect(meta('meta[property="og:type"]')).toBe('product');
    expect(meta('meta[property="og:image"]')).toBe('https://cdn.example/a.jpg');
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href).toBe(`${window.location.origin}/`);
  });

  it('keeps private pages out of search results, and only those', () => {
    const { rerender } = render(<Page meta={{ title: 'Your Bag', noindex: true }} />);
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow');

    rerender(<Page meta={{ title: 'Shop' }} />);
    expect(meta('meta[name="robots"]')).toBeNull();
  });

  it('writes structured data that cannot break out of its script tag', () => {
    render(<Page meta={{ title: 'X', jsonLd: { '@type': 'Product', name: '</script><img src=x onerror=alert(1)>' } }} />);

    const script = document.getElementById('seo-jsonld')!;
    expect(script.getAttribute('type')).toBe('application/ld+json');
    expect(script.textContent).not.toContain('</script>');
    expect(JSON.parse(script.textContent!).name).toBe('</script><img src=x onerror=alert(1)>');
    expect(document.querySelectorAll('script#seo-jsonld')).toHaveLength(1);
  });

  it('puts the defaults back when the page goes away, so no page inherits another\'s title', () => {
    const { unmount } = render(<Page meta={{ title: 'Order details', noindex: true, jsonLd: { a: 1 } }} />);
    expect(document.title).toBe('Order details');

    unmount();
    expect(document.title).toBe(DEFAULT_TITLE);
    expect(meta('meta[name="robots"]')).toBeNull();
    expect(document.getElementById('seo-jsonld')).toBeNull();
  });

  it('updates in place when the page changes its meta', () => {
    const { rerender } = render(<Page meta={{ title: 'Product A' }} />);
    rerender(<Page meta={{ title: 'Product B' }} />);
    expect(document.title).toBe('Product B');
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
  });
});
