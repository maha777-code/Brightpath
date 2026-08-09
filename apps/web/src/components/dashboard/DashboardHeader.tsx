import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, UserRound, Cake, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AGE_GROUP_LABELS, type AgeGroup, type CurriculumUpgradeEvent, type ParentUser } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { AgeSettingsModal } from '@/components/age/AgeSettingsModal';

export type SubjectFilter = 'all' | 'phonics' | 'math' | 'science';

interface DashboardHeaderProps {
  learnerName: string;
  ageGroup: AgeGroup | null;
  subjectFilter?: SubjectFilter;
  onSubjectFilterChange?: (filter: SubjectFilter) => void;
  onOpenSettings?: () => void;
  onCurriculumUpdated: (parent: ParentUser, curriculum: CurriculumUpgradeEvent) => void;
}

const SUBJECT_FILTERS: { id: SubjectFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'phonics', label: 'Phonics' },
  { id: 'math', label: 'Math' },
  { id: 'science', label: 'Science' },
];

export function DashboardHeader({
  learnerName,
  ageGroup,
  subjectFilter = 'all',
  onSubjectFilterChange,
  onOpenSettings,
  onCurriculumUpdated,
}: DashboardHeaderProps) {
  const { parent, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [ageOpen, setAgeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const subjectsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
      if (!subjectsRef.current?.contains(e.target as Node)) setSubjectsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5 no-underline">
            <span className="h-9 w-9 rounded-full bg-[conic-gradient(from_210deg,#6366f1,#ec4899,#0d9488,#3b82f6,#6366f1)] shadow-md" />
            <span className="hidden text-sm font-extrabold text-slate-800 sm:inline md:text-base">
              Brightpath AI Tutor
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-5 text-sm font-semibold text-slate-500 lg:flex">
            <div className="relative" ref={subjectsRef}>
              <button
                type="button"
                onClick={() => setSubjectsOpen((v) => !v)}
                className={[
                  'inline-flex items-center gap-1 hover:text-teal-700',
                  subjectFilter !== 'all' ? 'text-teal-700' : '',
                ].join(' ')}
              >
                Subjects
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {subjectsOpen && (
                <div className="absolute left-0 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {SUBJECT_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={[
                        'block w-full px-3 py-2 text-left text-sm hover:bg-teal-50',
                        subjectFilter === f.id ? 'font-bold text-teal-700' : 'text-slate-700',
                      ].join(' ')}
                      onClick={() => {
                        onSubjectFilterChange?.(f.id);
                        setSubjectsOpen(false);
                        document.getElementById('path')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a href="/#how-it-works" className="hover:text-teal-700">
              How It Works
            </a>
            <a href="/#pricing" className="hover:text-teal-700">
              Pricing
            </a>
            <a href="/#schools" className="hover:text-teal-700">
              For Schools
            </a>
            <Link to="/parent" className="hover:text-teal-700">
              Parent
            </Link>
          </nav>

          <div className="relative ml-auto" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:border-teal-300"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-indigo-500 text-xs font-bold text-white">
                {learnerName.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-sm font-semibold text-slate-700 sm:inline">
                {learnerName}&apos;s Profile
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
                  {parent?.email}
                  {ageGroup && (
                    <div className="mt-1 font-semibold text-teal-700">{AGE_GROUP_LABELS[ageGroup]}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setOpen(false);
                    onOpenSettings?.();
                  }}
                >
                  <Settings2 className="h-4 w-4" /> Profile Settings
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setOpen(false);
                    setAgeOpen(true);
                  }}
                >
                  <Cake className="h-4 w-4" /> Age & Grade Settings
                </button>
                <Link
                  to="/parent"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <UserRound className="h-4 w-4" /> Switch Child
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <AgeSettingsModal
        open={ageOpen}
        currentDob={parent?.dateOfBirth ?? null}
        currentGroup={parent?.calculatedAgeGroup ?? null}
        onClose={() => setAgeOpen(false)}
        onSaved={onCurriculumUpdated}
      />
    </>
  );
}
