import { useEffect, useState } from 'react';

const INTERVAL_MS = 2500;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HeroRotatingWord({ words }: { words: readonly string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2 || prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % words.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [words.length]);

  const prev = (index - 1 + words.length) % words.length;

  return (
    <span className="bp-rotator" aria-hidden="true">
      {words.map((word, i) => (
        <span
          key={word}
          className={`bp-rotator-word${i === index ? ' is-active' : i === prev ? ' is-leaving' : ''}`}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
