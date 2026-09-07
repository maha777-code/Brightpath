import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { GameplayHudStats } from '@brightpath/shared';
import { PIXEL_COLORS, PIXEL_FONT, actionLabel, parseHudNumber } from './pixelTheme';

function Bar({
  label,
  value01,
  color,
}: {
  label: string;
  value01: number;
  color: string;
}) {
  const pct = Math.max(0.06, Math.min(1, value01));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 3, fontFamily: PIXEL_FONT }}>
        {label}
      </div>
      <div
        style={{
          height: 12,
          background: '#020617',
          border: '2px solid #1e293b',
          imageRendering: 'pixelated',
        }}
      >
        <div style={{ width: `${pct * 100}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function highlightTerminal(code: string): React.ReactNode {
  const parts = code.split(/(\/\/[^\n]*|\b(?:if|else|while|const|let|return)\b|[=(){};])/g);
  return parts.map((p, i) => {
    let color = PIXEL_COLORS.terminalText;
    if (p.startsWith('//')) color = '#64748b';
    else if (/^(if|else|while|const|let|return)$/.test(p)) color = '#f472b6';
    else if (/[=(){};]/.test(p)) color = '#fde68a';
    return (
      <span key={i} style={{ color }}>
        {p}
      </span>
    );
  });
}

export const RetroGameHUD: React.FC<{
  topicTitle: string;
  level?: string;
  terminal?: string;
  hud?: GameplayHudStats;
  action?: string;
  progress01: number;
  showExpFloater?: boolean;
}> = ({ topicTitle, level, terminal, hud, action, progress01, showExpFloater }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cpu = parseHudNumber(hud?.cpu_usage, 20) / 100;
  const manaRaw = String(hud?.mana ?? '80/100');
  const manaParts = manaRaw.split('/');
  const mana =
    manaParts.length === 2 ? Number(manaParts[0]) / Math.max(1, Number(manaParts[1])) : 0.8;
  const exp = Number(hud?.exp ?? 100);
  const floaterY = interpolate(progress01, [0.12, 0.45], [0, -48], { extrapolateRight: 'clamp' });
  const floaterOp = interpolate(progress01, [0.12, 0.22, 0.48], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blink = Math.sin(t * 8) > 0 ? 1 : 0.35;

  return (
    <>
      {/* Level badge */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          background: PIXEL_COLORS.hud,
          border: `3px solid ${PIXEL_COLORS.hudBorder}`,
          color: '#fef08a',
          fontFamily: PIXEL_FONT,
          fontSize: 15,
          letterSpacing: 1,
          boxShadow: '6px 6px 0 #020617',
          zIndex: 8,
        }}
      >
        {level || 'LVL 1'}
      </div>

      {/* Topic chip */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          maxWidth: 280,
          padding: '6px 10px',
          background: PIXEL_COLORS.hud,
          border: '3px solid #64748b',
          color: '#e2e8f0',
          fontFamily: PIXEL_FONT,
          fontSize: 11,
          zIndex: 8,
        }}
      >
        QUEST: {topicTitle}
      </div>

      {/* Action chip */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          padding: '6px 10px',
          background: PIXEL_COLORS.hud,
          border: `3px solid ${PIXEL_COLORS.cpu}`,
          color: PIXEL_COLORS.cpu,
          fontFamily: PIXEL_FONT,
          fontSize: 11,
          opacity: blink,
          zIndex: 8,
        }}
      >
        {actionLabel(action)}
      </div>

      {/* Terminal */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          bottom: 118,
          width: 430,
          height: 168,
          background: PIXEL_COLORS.terminal,
          border: '3px solid #22c55e',
          boxShadow: '6px 6px 0 #022c22',
          padding: '10px 12px',
          fontFamily: PIXEL_FONT,
          fontSize: 13,
          lineHeight: 1.35,
          color: PIXEL_COLORS.terminalText,
          overflow: 'hidden',
          zIndex: 8,
        }}
      >
        <div style={{ color: '#4ade80', marginBottom: 6 }}>C:\BRIGHTPATH\TERMINAL&gt;_</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: PIXEL_FONT }}>
          {highlightTerminal(terminal || '// compiling level rules…')}
        </pre>
      </div>

      {/* Stat bars */}
      <div
        style={{
          position: 'absolute',
          right: 18,
          bottom: 118,
          width: 230,
          background: PIXEL_COLORS.hud,
          border: `3px solid ${PIXEL_COLORS.hudBorder}`,
          padding: '10px 12px',
          boxShadow: '6px 6px 0 #020617',
          zIndex: 8,
        }}
      >
        <Bar label={`CPU ${hud?.cpu_usage ?? '12%'}`} value01={cpu} color={PIXEL_COLORS.cpu} />
        <Bar label={`MANA ${manaRaw}`} value01={mana} color={PIXEL_COLORS.mana} />
        <Bar
          label={`EXP ${exp}${hud?.variance ? ` · ${hud.variance}` : ''}`}
          value01={Math.min(1, exp / 1000)}
          color={PIXEL_COLORS.exp}
        />
      </div>

      {showExpFloater ? (
        <div
          style={{
            position: 'absolute',
            left: 240,
            top: 280 + floaterY,
            opacity: floaterOp,
            color: PIXEL_COLORS.exp,
            fontFamily: PIXEL_FONT,
            fontSize: 22,
            textShadow: '3px 3px 0 #000',
            zIndex: 9,
          }}
        >
          +{Math.max(20, Math.round(exp / 8))} EXP
        </div>
      ) : null}
    </>
  );
};
