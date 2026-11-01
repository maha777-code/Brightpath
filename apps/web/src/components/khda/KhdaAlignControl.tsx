import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { readKhdaAlign, subscribeKhdaAlign, writeKhdaAlign } from '@/lib/khdaAlign';

export function KhdaAlignControl({ compact = false }: { compact?: boolean }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readKhdaAlign());
    return subscribeKhdaAlign(() => setEnabled(readKhdaAlign()));
  }, []);

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-cyan-400"
          checked={enabled}
          onChange={(event) => {
            writeKhdaAlign(event.target.checked);
            setEnabled(event.target.checked);
          }}
        />
        <span>
          <span className="block text-base font-bold text-white">Align lessons to a Dubai private school (KHDA)</span>
          <span className="mt-1 block text-sm leading-relaxed text-slate-300">
            {compact
              ? 'Mandatory subjects stay on the Ministry of Education curriculum. Other subjects stay on the school’s licensed curriculum. This is not a KHDA rating.'
              : 'Lesson plans then keep Arabic, Islamic Education, and social and moral studies on the UAE Ministry of Education curriculum, and keep every other subject on the school’s licensed curriculum. The teacher still reviews the plan. This does not rate or certify the school.'}
          </span>
        </span>
      </label>
      <p className="mt-3 text-sm text-slate-400">
        <Link to="/khda" className="font-semibold text-cyan-300 hover:text-cyan-200">
          KHDA safety, curriculum, and wellbeing alignment
        </Link>
      </p>
    </div>
  );
}
