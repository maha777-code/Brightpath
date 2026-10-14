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

export function usePageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PUBLIC_PAGES.find((entry) => entry.path === pathname) ?? DEFAULT_PAGE;
    document.title = page.title;
    setMeta('meta[name="description"]', 'name', 'description', page.description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', page.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', page.description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', `${SITE_URL}${page.path === '/' ? '' : page.path}`);
  }, [pathname]);
}
