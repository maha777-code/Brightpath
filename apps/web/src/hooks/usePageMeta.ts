import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PUBLIC_PAGES, SITE_URL } from '@/content/marketing';

const DEFAULT_PAGE = PUBLIC_PAGES[0];

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setCanonical(href: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function usePageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const publicPage = PUBLIC_PAGES.find((entry) => entry.path === pathname);
    const page = publicPage ?? DEFAULT_PAGE;
    const url = `${SITE_URL}${page.path}`;
    document.title = page.title;
    setMeta('meta[name="description"]', 'name', 'description', page.description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', page.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', page.description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', page.title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', page.description);
    setMeta('meta[name="robots"]', 'name', 'robots', publicPage ? 'index, follow' : 'noindex');
    setCanonical(publicPage ? url : null);
  }, [pathname]);
}
