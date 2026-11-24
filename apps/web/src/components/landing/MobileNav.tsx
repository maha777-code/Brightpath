import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import {
  AI_SOLUTION_AUDIENCES,
  AI_SOLUTION_FEATURE,
  AI_SOLUTION_WHY,
  LANDING_NAV_LINKS,
} from './landingNav';

const DESKTOP_QUERY = '(min-width: 1024px)';
const SCROLL_GAP = 12;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollToHash(hash: string, header: HTMLElement | null) {
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) return;
  // A stuck sticky element reports its stuck position, not where it sits in the page.
  const sticky = getComputedStyle(target).position === 'sticky';
  const inlinePosition = target.style.position;
  if (sticky) target.style.position = 'static';
  const top = target.getBoundingClientRect().top + window.scrollY;
  if (sticky) target.style.position = inlinePosition;
  const offset = (header?.getBoundingClientRect().height ?? 0) + SCROLL_GAP;
  window.scrollTo({ top: Math.max(0, top - offset), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function MobileNav({ loginHref, startHref }: { loginHref: string; startHref: string }) {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(true);
  const wasOpenRef = useRef(false);
  const panelId = useId();
  const aiId = useId();

  const close = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    setOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const header = rootRef.current?.closest('header');
      const panel = panelRef.current;
      if (panel && header) {
        const available = window.innerHeight - header.getBoundingClientRect().bottom - SCROLL_GAP;
        panel.style.setProperty('--bp-mnav-max-h', `${Math.max(available, 200)}px`);
      }
      panel?.querySelector<HTMLElement>('a[href], button')?.focus({ preventScroll: true });
      return;
    }
    setAiOpen(false);
    if (wasOpenRef.current && restoreFocusRef.current) buttonRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = false;
    restoreFocusRef.current = true;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || rootRef.current?.contains(target)) return;
      close(!target.closest('a, button, input, select, textarea, [tabindex]'));
    };
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onDesktop = () => {
      if (desktop.matches) close(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    desktop.addEventListener('change', onDesktop);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      desktop.removeEventListener('change', onDesktop);
    };
  }, [open, close]);

  const onHashClick = (event: MouseEvent<HTMLAnchorElement>, hash: string) => {
    event.preventDefault();
    const header = rootRef.current?.closest('header') ?? null;
    close();
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    requestAnimationFrame(() => scrollToHash(hash, header));
  };

  const renderLink = (href: string, className: string, children: JSX.Element | string) =>
    href.startsWith('#') ? (
      <a href={href} className={className} onClick={(event) => onHashClick(event, href)}>
        {children}
      </a>
    ) : (
      <Link to={href} className={className} onClick={() => close(false)}>
        {children}
      </Link>
    );

  return (
    <div ref={rootRef} className="bp-mnav">
      <button
        ref={buttonRef}
        type="button"
        className="bp-mnav-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>

      <div id={panelId} ref={panelRef} className="bp-mnav-panel" data-open={open}>
        <nav aria-label="Mobile">
          <ul className="bp-mnav-list">
            <li>
              <button
                type="button"
                className="bp-mnav-link bp-mnav-expander"
                aria-expanded={aiOpen}
                aria-controls={aiId}
                onClick={() => setAiOpen((value) => !value)}
              >
                AI Solutions
                <ChevronDown className="bp-mnav-chevron" size={20} aria-hidden="true" />
              </button>
              <div id={aiId} className="bp-mnav-sub" data-open={aiOpen}>
                <div className="bp-mnav-sub-inner">
                  <ul className="bp-mnav-list">
                    {AI_SOLUTION_AUDIENCES.map((item) => (
                      <li key={item.title}>
                        {renderLink(
                          item.href,
                          'bp-mnav-audience',
                          <>
                            <span className="bp-mnav-audience-title">
                              <span aria-hidden="true">{item.icon}</span> {item.title}
                            </span>
                            <span className="bp-mnav-desc">{item.description}</span>
                          </>,
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="bp-mnav-feature">
                    <span className="bp-mnav-badge">{AI_SOLUTION_FEATURE.badge}</span>
                    <p className="bp-mnav-desc">{AI_SOLUTION_FEATURE.text}</p>
                    {renderLink(
                      AI_SOLUTION_FEATURE.href,
                      'bp-mnav-feature-link',
                      <>
                        {AI_SOLUTION_FEATURE.linkLabel} <span aria-hidden="true">→</span>
                      </>,
                    )}
                  </div>
                  <p className="bp-mnav-why-label">Why MindVault</p>
                  <ul className="bp-mnav-why">
                    {AI_SOLUTION_WHY.map((item) => (
                      <li key={item.label}>
                        <span aria-hidden="true">{item.icon}</span> {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
            {LANDING_NAV_LINKS.map((link) => (
              <li key={link.href}>{renderLink(link.href, 'bp-mnav-link', link.label)}</li>
            ))}
          </ul>
          <div className="bp-mnav-actions">
            <Link to={loginHref} className="bp-mnav-login" onClick={() => close(false)}>
              Log In
            </Link>
            <Link
              to={startHref}
              className="bp-btn bp-btn--primary bp-mnav-start"
              onClick={() => close(false)}
            >
              Get Started For Free
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
