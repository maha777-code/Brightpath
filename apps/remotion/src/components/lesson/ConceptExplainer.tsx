import React from 'react';
import { interpolate } from 'remotion';
import type { ConceptSolid, ConceptVisual, VisualContentDomain } from '@brightpath/shared';

const FONT = 'Inter, system-ui, sans-serif';

type Palette = {
  ink: string;
  muted: string;
  accent: string;
  accentDeep: string;
  card: string;
  soft: string;
  line: string;
};

function paletteFor(domain?: VisualContentDomain): Palette {
  if (domain === 'physics') {
    return {
      ink: '#1e1b4b',
      muted: '#4c1d95',
      accent: '#d97706',
      accentDeep: '#1e3a8a',
      card: '#fff7ed',
      soft: '#e0e7ff',
      line: '#c4b5fd',
    };
  }
  if (domain === 'chemistry') {
    return {
      ink: '#1e1b4b',
      muted: '#5b21b6',
      accent: '#7c3aed',
      accentDeep: '#4c1d95',
      card: '#f5f3ff',
      soft: '#ede9fe',
      line: '#c4b5fd',
    };
  }
  if (domain === 'biology') {
    return {
      ink: '#14532d',
      muted: '#166534',
      accent: '#16a34a',
      accentDeep: '#3f6212',
      card: '#f7fee7',
      soft: '#dcfce7',
      line: '#86efac',
    };
  }
  if (domain === 'math' || domain === 'dsml') {
    return {
      ink: '#1e293b',
      muted: '#334155',
      accent: '#2563eb',
      accentDeep: '#1e3a8a',
      card: '#eff6ff',
      soft: '#dbeafe',
      line: '#93c5fd',
    };
  }
  return {
    ink: '#1a2332',
    muted: '#3f4a59',
    accent: '#0d9488',
    accentDeep: '#134e4a',
    card: '#f0fdfa',
    soft: '#ccfbf1',
    line: '#99f6e4',
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function DomainGlyph({ domain, color }: { domain?: VisualContentDomain; color: string }) {
  if (domain === 'physics') {
    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="22" fill={color} />
        <line x1="80" y1="80" x2="142" y2="38" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <polygon points="142,38 118,36 132,58" fill={color} />
        <line x1="80" y1="80" x2="36" y2="128" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <polygon points="36,128 58,118 40,104" fill={color} />
      </svg>
    );
  }
  if (domain === 'chemistry') {
    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="58" cy="80" r="32" fill="none" stroke={color} strokeWidth="8" />
        <circle cx="102" cy="80" r="32" fill="none" stroke={color} strokeWidth="8" />
        <circle cx="58" cy="80" r="10" fill={color} />
        <circle cx="102" cy="80" r="10" fill={color} />
      </svg>
    );
  }
  if (domain === 'biology') {
    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        <ellipse cx="80" cy="80" rx="58" ry="46" fill="none" stroke={color} strokeWidth="8" />
        <circle cx="80" cy="80" r="18" fill={color} />
        <circle cx="112" cy="58" r="8" fill={color} opacity="0.55" />
      </svg>
    );
  }
  if (domain === 'math' || domain === 'dsml') {
    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        <line x1="24" y1="128" x2="136" y2="128" stroke={color} strokeWidth="6" />
        <line x1="32" y1="136" x2="32" y2="28" stroke={color} strokeWidth="6" />
        <path d="M36 112 C 60 112, 72 40, 132 36" fill="none" stroke={color} strokeWidth="8" />
        <circle cx="96" cy="56" r="8" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <rect x="36" y="36" width="88" height="88" rx="22" fill="none" stroke={color} strokeWidth="8" />
      <circle cx="80" cy="80" r="16" fill={color} />
    </svg>
  );
}

function ConceptBoard({
  subject,
  labels,
  progress01,
  domain,
}: {
  subject: string;
  labels: string[];
  progress01: number;
  domain?: VisualContentDomain;
}) {
  const p = paletteFor(domain);
  const items = labels.length ? labels : [subject];
  const shown = Math.min(items.length, Math.max(1, Math.ceil(clamp01(progress01) * items.length)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 48, width: '100%', maxWidth: 1560 }}>
      <div
        style={{
          width: 380,
          minHeight: 380,
          borderRadius: 36,
          background: p.card,
          border: `2px solid ${p.line}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          boxShadow: '0 18px 36px rgba(15,23,42,0.08)',
        }}
      >
        <DomainGlyph domain={domain} color={p.accent} />
        <div style={{ marginTop: 16, fontSize: 32, fontWeight: 800, color: p.ink, textAlign: 'center' }}>{subject}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.slice(0, shown).map((item, i) => (
          <div
            key={`${item}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: '#fff',
              borderRadius: 22,
              padding: '18px 24px',
              border: `1px solid ${p.line}`,
              boxShadow: '0 10px 22px rgba(15,23,42,0.06)',
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 99,
                background: p.accent,
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: 30, fontWeight: 650, color: p.ink }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CycleWheel({ labels, progress01, domain }: { labels: string[]; progress01: number; domain?: VisualContentDomain }) {
  const p = paletteFor(domain);
  const items = labels.length ? labels : ['Start', 'Change', 'Return'];
  const shown = Math.min(items.length, Math.max(1, Math.ceil(clamp01(progress01) * items.length)));
  return (
    <div style={{ position: 'relative', width: 720, height: 520 }}>
      <div
        style={{
          position: 'absolute',
          left: 180,
          top: 120,
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: `10px dashed ${p.line}`,
        }}
      />
      {items.slice(0, shown).map((item, i) => {
        const angle = (-90 + (360 / items.length) * i) * (Math.PI / 180);
        const x = 360 + Math.cos(angle) * 230 - 110;
        const y = 260 + Math.sin(angle) * 190 - 36;
        return (
          <div
            key={item}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              minWidth: 220,
              padding: '14px 18px',
              borderRadius: 18,
              background: p.accentDeep,
              color: '#f8fafc',
              fontWeight: 750,
              fontSize: 22,
              textAlign: 'center',
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

function SequenceTrack({ labels, progress01, domain }: { labels: string[]; progress01: number; domain?: VisualContentDomain }) {
  const p = paletteFor(domain);
  const items = labels.length ? labels : ['Start', 'Then', 'Result'];
  const shown = Math.min(items.length, Math.max(1, Math.ceil(clamp01(progress01) * items.length)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap', maxWidth: 1500 }}>
      {items.slice(0, shown).map((item, i) => (
        <React.Fragment key={`${item}-${i}`}>
          <div
            style={{
              minWidth: 200,
              maxWidth: 280,
              minHeight: 168,
              padding: 22,
              borderRadius: 24,
              background: i % 2 === 0 ? p.accent : p.accentDeep,
              color: '#f8fafc',
              fontSize: 26,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: '0 16px 30px rgba(15,23,42,0.12)',
            }}
          >
            {item}
          </div>
          {i < shown - 1 ? <div style={{ fontSize: 48, color: p.accent, fontWeight: 800 }}>→</div> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

function FieldDiagram({
  subject,
  labels,
  progress01,
  domain,
}: {
  subject: string;
  labels: string[];
  progress01: number;
  domain?: VisualContentDomain;
}) {
  const p = paletteFor(domain);
  const shown = Math.min(Math.max(labels.length, 1), Math.max(1, Math.ceil(clamp01(progress01) * Math.max(labels.length, 1))));
  return (
    <div style={{ position: 'relative', width: 980, height: 480 }}>
      <div
        style={{
          position: 'absolute',
          left: 360,
          top: 150,
          width: 260,
          height: 180,
          borderRadius: 28,
          background: p.accentDeep,
          color: '#fff7ed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          fontWeight: 800,
          textAlign: 'center',
          padding: 16,
        }}
      >
        {subject}
      </div>
      {labels.slice(0, shown).map((label, i) => {
        const left = i % 2 === 0;
        return (
          <div
            key={label}
            style={{
              position: 'absolute',
              left: left ? 40 : 700,
              top: 70 + i * 90,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: p.ink,
              fontSize: 26,
              fontWeight: 750,
            }}
          >
            {left ? (
              <>
                <span>{label}</span>
                <span style={{ color: p.accent, fontSize: 40 }}>→</span>
              </>
            ) : (
              <>
                <span style={{ color: p.accent, fontSize: 40 }}>→</span>
                <span>{label}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComparePair({
  left,
  right,
  progress01,
  domain,
}: {
  left: string[];
  right: string[];
  progress01: number;
  domain?: VisualContentDomain;
}) {
  const p = paletteFor(domain);
  const t = clamp01(progress01);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, width: '100%', maxWidth: 1400 }}>
      {[left, right].map((side, i) => (
        <div
          key={i}
          style={{
            background: i === 0 ? p.accentDeep : p.accent,
            borderRadius: 32,
            minHeight: 360,
            padding: 36,
            color: '#fff7ed',
            transform: `translateX(${interpolate(t, [0, 1], [i === 0 ? -40 : 40, 0])}px)`,
          }}
        >
          {side.map((line) => (
            <p key={line} style={{ margin: '0 0 14px', fontSize: 30, fontWeight: 650 }}>
              {line}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function EquationBoard({ formula, labels, domain }: { formula?: string; labels: string[]; domain?: VisualContentDomain }) {
  const p = paletteFor(domain);
  return (
    <div
      style={{
        minWidth: 720,
        minHeight: 280,
        borderRadius: 32,
        background: p.accentDeep,
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: 0.5, textAlign: 'center' }}>
        {formula || labels[0] || '—'}
      </div>
      {labels[1] ? <div style={{ marginTop: 18, fontSize: 26, color: p.soft }}>{labels[1]}</div> : null}
    </div>
  );
}

function TimelineBar({ labels, progress01, domain }: { labels: string[]; progress01: number; domain?: VisualContentDomain }) {
  const p = paletteFor(domain);
  const items = labels.length ? labels : ['Then', 'Next', 'Now'];
  const shown = Math.min(items.length, Math.max(1, Math.ceil(clamp01(progress01) * items.length)));
  return (
    <div style={{ width: '100%', maxWidth: 1400 }}>
      <div style={{ height: 8, background: p.line, borderRadius: 99, margin: '40px 40px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -22, padding: '0 20px' }}>
        {items.slice(0, shown).map((item) => (
          <div key={item} style={{ textAlign: 'center', width: 220 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: p.accent, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: p.ink }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountBurst({ value, label, progress01, domain }: { value: string; label: string; progress01: number; domain?: VisualContentDomain }) {
  const p = paletteFor(domain);
  const scale = interpolate(clamp01(progress01), [0, 0.35, 1], [0.7, 1.08, 1]);
  return (
    <div style={{ textAlign: 'center', transform: `scale(${scale})` }}>
      <div style={{ fontSize: 140, fontWeight: 800, color: p.accent, letterSpacing: -4, lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 16, fontSize: 34, color: p.muted }}>{label}</div>
    </div>
  );
}

const TEAL = ['#5eead4', '#14b8a6', '#0d9488', '#0f766e', '#134e4a', '#115e59'];

function CssSolid({
  solid,
  progress01,
  labels,
}: {
  solid: ConceptSolid;
  progress01: number;
  labels: string[];
}) {
  const t = clamp01(progress01);
  const rotY = interpolate(t, [0, 1], [18, 148]);
  const rotX = interpolate(t, [0, 1], [-22, -32]);
  const isCuboid = solid === 'cuboid' || solid === 'prism';
  const w = isCuboid ? 340 : 260;
  const h = 260;
  const d = isCuboid ? 180 : 260;
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;

  if (solid === 'sphere' || solid === 'hemisphere') {
    return (
      <div
        style={{
          width: 300,
          height: 300,
          borderRadius: solid === 'hemisphere' ? '150px 150px 28px 28px' : '50%',
          background: 'conic-gradient(from 40deg, #5eead4, #0f766e, #134e4a, #14b8a6, #5eead4)',
        }}
      />
    );
  }
  if (solid === 'cylinder') {
    return (
      <svg width="360" height="360" viewBox="0 0 360 360">
        <path d="M80 80 V250 C80 286 280 286 280 250 V80" fill="#0d9488" />
        <ellipse cx="180" cy="80" rx="100" ry="32" fill="#99f6e4" />
        <ellipse cx="180" cy="250" rx="100" ry="32" fill="#134e4a" />
      </svg>
    );
  }
  if (solid === 'cone' || solid === 'pyramid') {
    return (
      <svg width="360" height="360" viewBox="0 0 360 360">
        <polygon points="180,40 60,290 300,290" fill="#0d9488" />
      </svg>
    );
  }

  const transforms = [
    `translateZ(${hz}px)`,
    `rotateY(180deg) translateZ(${hz}px)`,
    `rotateY(90deg) translateZ(${hx}px)`,
    `rotateY(-90deg) translateZ(${hx}px)`,
    `rotateX(90deg) translateZ(${hy}px)`,
    `rotateX(-90deg) translateZ(${hy}px)`,
  ];
  return (
    <div style={{ perspective: 980, width: w, height: h }}>
      <div style={{ width: w, height: h, position: 'relative', transformStyle: 'preserve-3d', transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)` }}>
        {transforms.map((tf, i) => (
          <div
            key={tf}
            style={{
              position: 'absolute',
              inset: 0,
              background: TEAL[i],
              transform: tf,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ecfdf5',
              fontWeight: 750,
              fontSize: 24,
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            {labels[i] || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConceptExplainer({
  visual,
  progress01,
  formula,
  left,
  right,
  statValue,
  statLabel,
}: {
  visual: ConceptVisual;
  progress01: number;
  formula?: string;
  left?: string[];
  right?: string[];
  statValue?: string;
  statLabel?: string;
}) {
  const labels = visual.labels.length ? visual.labels : visual.objects;
  const domain = visual.domain;
  const kind = visual.kind;

  if (kind === 'views' || kind === 'solid' || kind === 'net') {
    return <CssSolid solid={visual.solid || 'cube'} progress01={progress01} labels={labels} />;
  }
  if (kind === 'cycle') return <CycleWheel labels={labels} progress01={progress01} domain={domain} />;
  if (kind === 'sequence' || kind === 'process') {
    return <SequenceTrack labels={labels} progress01={progress01} domain={domain} />;
  }
  if (kind === 'field') {
    return <FieldDiagram subject={visual.subject} labels={labels} progress01={progress01} domain={domain} />;
  }
  if (kind === 'compare') {
    return (
      <ComparePair
        left={left?.length ? left : labels.slice(0, 2)}
        right={right?.length ? right : labels.slice(2, 4)}
        progress01={progress01}
        domain={domain}
      />
    );
  }
  if (kind === 'equation' || kind === 'formula') {
    return <EquationBoard formula={formula} labels={labels} domain={domain} />;
  }
  if (kind === 'timeline') return <TimelineBar labels={labels} progress01={progress01} domain={domain} />;
  if (kind === 'count') {
    return (
      <CountBurst value={statValue || labels[0] || '—'} label={statLabel || visual.subject} progress01={progress01} domain={domain} />
    );
  }
  return (
    <ConceptBoard subject={visual.subject} labels={labels} progress01={progress01} domain={domain} />
  );
}
