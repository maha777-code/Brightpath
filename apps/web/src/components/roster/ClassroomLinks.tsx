import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, Users } from 'lucide-react';
import { oversightApi } from '@/lib/rosterApi';

export function ClassroomLinks({ academy = false }: { academy?: boolean }) {
  const [openAlerts, setOpenAlerts] = useState<number | null>(null);

  useEffect(() => {
    oversightApi
      .summary()
      .then((s) => setOpenAlerts(s.openAlerts))
      .catch(() => setOpenAlerts(null));
  }, []);

  const items = [
    {
      to: '/classes',
      icon: Users,
      title: academy ? 'Batches & Students' : 'Classes & Students',
      body: academy
        ? 'Courses, batches, tutor assignment, join codes and QR, spreadsheet roster import and student profiles.'
        : 'Grades and departments, classes, teacher assignment, join codes and QR, spreadsheet roster import and student profiles.',
    },
    {
      to: '/sharada-oversight',
      icon: Eye,
      title: 'Sharada Oversight',
      body:
        openAlerts && openAlerts > 0
          ? `${openAlerts} open safety alert${openAlerts === 1 ? '' : 's'} to review. Read student chats and follow live sessions.`
          : 'Read student conversations with Sharada, follow live sessions and review safety alerts.',
    },
  ];

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="group flex items-start gap-4 rounded-2xl border border-slate-800/80 bg-[#0b101d] p-5 text-slate-100 no-underline shadow-xl transition hover:border-cyan-500/40"
        >
          <span className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
            <item.icon className="h-6 w-6 text-cyan-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-lg font-extrabold text-white">
              {item.title} <ArrowRight className="h-4 w-4 text-cyan-400 transition group-hover:translate-x-1" />
            </span>
            <span className="mt-1 block text-sm text-slate-400">{item.body}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
