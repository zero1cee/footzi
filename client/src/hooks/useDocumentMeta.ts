import { useEffect } from 'react';

const DEFAULT_TITLE = 'FOOTZI — Architectural Footwear & Leathercraft';
const DEFAULT_DESCRIPTION =
  "Footzi — Premium handcrafted footwear inspired by modern minimalism and Agra's architectural heritage. Made for discerning modern India.";

export interface DocumentMeta {
  title: string;
  description?: string;
  /** Absolute or site-relative image used for link previews. */
  image?: string;
  /** Keeps private pages (bag, checkout, account) out of search results. */
  noindex?: boolean;
  type?: 'website' | 'product';
  /** Structured data for search engines, e.g. a schema.org Product. */
  jsonLd?: Record<string, unknown> | null;
}

const head = () => document.head;

const upsertMeta = (attr: 'name' | 'property', key: string, content: string | null) => {
  let el = head().querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    head().appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
  let el = head().querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    head().appendChild(el);
  }
  el.href = href;
};

const setJsonLd = (data: Record<string, unknown> | null | undefined) => {
  const existing = document.getElementById('seo-jsonld');
  if (!data) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('script');
  el.id = 'seo-jsonld';
  el.setAttribute('type', 'application/ld+json');
  // "<" is escaped so a product name can never close the script tag
  el.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  if (!existing) head().appendChild(el);
};

const apply = (meta: DocumentMeta) => {
  const description = meta.description ?? DEFAULT_DESCRIPTION;
  const url = `${window.location.origin}${window.location.pathname.replace(/\/$/, '') || ''}`;
  document.title = meta.title;
  upsertMeta('name', 'description', description);
  upsertCanonical(url || window.location.origin);
  upsertMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : null);
  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', meta.type ?? 'website');
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', meta.image ?? null);
  upsertMeta('name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary');
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', meta.image ?? null);
  setJsonLd(meta.jsonLd);
};

/**
 * Gives the current screen its own title, description and share tags, and puts the
 * site defaults back when the screen goes away, so a page that sets nothing never
 * inherits the previous page's title. The server sends the same tags in the first
 * response, so crawlers and link previews do not depend on this running.
 */
export const useDocumentMeta = (meta: DocumentMeta) => {
  const key = JSON.stringify(meta);

  useEffect(() => {
    apply(meta);
    return () => apply({ title: DEFAULT_TITLE });
    // `key` captures every field of `meta`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
};

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION };
