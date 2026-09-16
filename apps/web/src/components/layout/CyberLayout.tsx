import type { ReactNode } from 'react';
import { CYBER_FONT_STYLE } from '@/lib/theme';

export function CyberLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen bg-[#030712] text-slate-100 font-mono bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#030712] to-[#030712]"
      style={CYBER_FONT_STYLE}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0891b20a_1px,transparent_1px),linear-gradient(to_bottom,#0891b20a_1px,transparent_1px)] bg-[size:32px_32px]"
        aria-hidden="true"
      />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}

export default CyberLayout;
