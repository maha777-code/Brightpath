import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ScrollCardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  tag?: string;
}

interface ScrollingSectionProps {
  id?: string;
  title: string;
  subtitle: string;
  cards: ScrollCardItem[];
}

export function ScrollingSection({ id, title, subtitle, cards }: ScrollingSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ active: boolean; startX: number; startScroll: number; moved: boolean }>({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [indicator, setIndicator] = useState({ width: 100, left: 0 });

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(max - el.scrollLeft > 4);
    const width = el.scrollWidth <= 0 ? 100 : Math.max(18, (el.clientWidth / el.scrollWidth) * 100);
    const left = max <= 0 ? 0 : (el.scrollLeft / max) * (100 - width);
    setIndicator({ width, left });
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', updateScrollState);
    };
  }, [cards, updateScrollState]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-scroll-card]');
    const gap = 24;
    const amount = card ? card.offsetWidth + gap : 380;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.classList.add('is-dragging');
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - delta;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el || !drag.current.active) return;
    const shouldSnap = drag.current.moved;
    drag.current.active = false;
    el.classList.remove('is-dragging');
    if (el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    if (!shouldSnap) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-scroll-card]'));
    const origin = el.getBoundingClientRect().left;
    let nearest = el.scrollLeft;
    let best = Number.POSITIVE_INFINITY;
    for (const card of cards) {
      const left = card.getBoundingClientRect().left - origin + el.scrollLeft;
      const dist = Math.abs(left - el.scrollLeft);
      if (dist < best) {
        best = dist;
        nearest = left;
      }
    }
    el.scrollTo({ left: nearest, behavior: 'smooth' });
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <section id={id} className="bp-scroll-section py-12">
      <div className="bp-scroll-head flex items-end justify-between gap-6 px-6 lg:px-12">
        <div>
          <h2 className="bp-scroll-title text-2xl font-extrabold uppercase tracking-tight text-white md:text-4xl">
            {title}
          </h2>
          <p className="bp-scroll-sub mt-1 text-base text-slate-400 md:text-lg">{subtitle}</p>
        </div>

        <div className="bp-scroll-nav flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="bp-scroll-nav-btn p-3"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="bp-scroll-nav-btn p-3"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="bp-scroll-progress mx-6 mt-5 h-1 overflow-hidden rounded-full bg-slate-800 lg:mx-12" aria-hidden="true">
        <div
          className="bp-scroll-progress-bar h-full rounded-full bg-cyan-400"
          style={{ width: `${indicator.width}%`, marginLeft: `${indicator.left}%` }}
        />
      </div>

      <div
        ref={scrollContainerRef}
        className="bp-scroll-row mt-2 flex flex-nowrap gap-6 px-6 py-4 lg:px-12"
        aria-label={`${title} cards`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {cards.map((card) => (
          <article
            key={card.id}
            data-scroll-card
            className="bp-scroll-card flex shrink-0 flex-col justify-between space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-xl"
          >
            <div className="space-y-4">
              <div className="bp-scroll-icon flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/60 text-3xl text-cyan-400">
                {card.icon}
              </div>
              <h3 className="text-2xl font-bold text-white">{card.title}</h3>
              <p className="text-base leading-relaxed text-slate-400">{card.description}</p>
            </div>
            {card.tag ? (
              <div className="pt-4">
                <span className="bp-scroll-tag inline-block rounded-full border border-cyan-500/30 bg-cyan-950/60 px-3 py-1.5 text-sm font-semibold text-cyan-400">
                  {card.tag}
                </span>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
