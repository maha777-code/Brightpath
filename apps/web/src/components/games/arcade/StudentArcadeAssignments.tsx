import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { arcadePlayPath, type StudentArcadeAssignment } from '@brightpath/shared';
import { Gamepad2, Play, Sparkles } from 'lucide-react';
import { arcadeApi } from '@/lib/arcadeApi';

/** Student dashboard card listing arcade games assigned to the student's classes. */
export function StudentArcadeAssignments() {
  const [items, setItems] = useState<StudentArcadeAssignment[] | null>(null);

  useEffect(() => {
    let live = true;
    arcadeApi
      .mine()
      .then((res) => live && setItems(res.assignments))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, []);

  if (!items?.length) return null;
  const totalXp = items.reduce((sum, item) => sum + item.myXp, 0);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-[#080d1a] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <Gamepad2 className="h-4 w-4 text-violet-300" /> Arcade games from your teachers
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300">
          <Sparkles className="h-3 w-3" /> {totalXp} XP
        </span>
      </div>
      {items.map((item) => (
        <Link
          key={item.id}
          to={arcadePlayPath(item.id)}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/60 bg-[#0a0f20] p-3 no-underline hover:bg-slate-800/50"
        >
          <span className="min-w-0">
            <span className="line-clamp-1 block text-base font-bold text-slate-100">{item.title}</span>
            <span className="block text-xs text-slate-400">
              {item.className} · {item.myBestScore === null ? 'Not played yet' : `Best ${item.myBestScore.toLocaleString()} · ${item.myXp} XP`}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-violet-500/20 px-2.5 py-1.5 text-xs font-bold text-violet-200">
            <Play className="h-3.5 w-3.5" /> Play
          </span>
        </Link>
      ))}
    </div>
  );
}

export default StudentArcadeAssignments;
