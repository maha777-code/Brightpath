import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, RefreshCw } from 'lucide-react';
import type {
  StudentDoubt,
  TeacherChapter,
  TeacherSubtopic,
  Textbook,
} from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { DocumentUploader } from '@/components/teacher/DocumentUploader';
import { ChapterList } from '@/components/teacher/ChapterList';
import { SubtopicManager } from '@/components/teacher/SubtopicManager';
import { TeacherDoubtAssistant } from '@/components/teacher/TeacherDoubtAssistant';

const ACCENT = '#5B46BA';

export default function TeacherDashboard() {
  const { teacher, role, logout } = useAuth();
  const navigate = useNavigate();
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [chapters, setChapters] = useState<TeacherChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<TeacherChapter | null>(null);
  const [doubts, setDoubts] = useState<StudentDoubt[]>([]);
  const [previewSubtopic, setPreviewSubtopic] = useState<TeacherSubtopic | null>(null);
  const [engagementNote, setEngagementNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [structure, doubtRes] = await Promise.all([
        api.teacherChapters(),
        api.teacherDoubts(),
      ]);
      setTextbook(structure.textbook);
      setChapters(structure.chapters);
      setDoubts(doubtRes.doubts);
      setSelectedChapter((prev) => {
        if (!prev) return structure.chapters[0] ?? null;
        return structure.chapters.find((c) => c.id === prev.id) ?? structure.chapters[0] ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teacher dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== 'teacher') return;
    void load();
  }, [role, load]);

  const refreshChapter = async (chapterId: string) => {
    const res = await api.teacherChapter(chapterId);
    setSelectedChapter(res.chapter);
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? res.chapter : c)));
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-indigo-50 via-white to-violet-50 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-indigo-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md"
              style={{ background: ACCENT }}
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-slate-800">Brightpath Teacher</p>
              <p className="text-[11px] font-semibold text-slate-500">Curriculum & live doubt control</p>
            </div>
          </div>
          <nav className="mx-auto hidden items-center gap-5 text-sm font-semibold text-slate-500 md:flex">
            <span className="font-bold text-[#5B46BA]">Teacher Dashboard</span>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-800">{teacher?.name ?? 'Teacher'}</p>
              <p className="text-[11px] text-slate-500">
                {teacher?.schoolName ?? 'School'} · {teacher?.subjectFocus ?? 'Science'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
        <div className="rounded-3xl border border-indigo-100 bg-white/80 px-5 py-4 shadow-soft backdrop-blur-md">
          <h1 className="text-2xl font-black text-slate-900">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload textbooks, enrich lessons with video & games, and approve AI answers before class.
          </p>
        </div>

        {loading && (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-soft">
            Loading curriculum…
          </p>
        )}
        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}

        {!loading && (
          <>
            <DocumentUploader
              textbook={textbook}
              onUploaded={(t) => {
                setTextbook(t);
                setChapters([]);
                setSelectedChapter(null);
              }}
              onVerified={async (t) => {
                setTextbook(t);
                await load();
              }}
            />

            <div className="grid gap-5 xl:grid-cols-2">
              <ChapterList
                chapters={chapters}
                selectedId={selectedChapter?.id ?? null}
                onExplore={(ch) => {
                  setSelectedChapter(ch);
                  const withVideo = ch.subtopics.find((s) => s.hasVideoExplainer);
                  if (withVideo) setPreviewSubtopic(withVideo);
                  navigate(`/chapter/${ch.id}/explore`);
                }}
              />
              <SubtopicManager
                chapter={selectedChapter}
                onUpdated={(id) => void refreshChapter(id)}
                onPreviewVideo={(sub) => {
                  setPreviewSubtopic(sub);
                  setEngagementNote(`Previewing ${sub.code} video explainer`);
                }}
                onAssignActivity={(sub) => {
                  setEngagementNote(`Assigned gamified activity: ${sub.activityTitle ?? sub.title}`);
                }}
              />
            </div>

            <TeacherDoubtAssistant
              doubts={doubts}
              previewSubtopic={previewSubtopic}
              engagementNote={engagementNote}
              onReviewed={() => void load()}
              onContinue={() => setEngagementNote('Session continued — students may proceed.')}
              onAssignActivity={() =>
                setEngagementNote(
                  previewSubtopic?.activityTitle
                    ? `Activity assigned: ${previewSubtopic.activityTitle}`
                    : 'Select a subtopic with a gamified activity first.',
                )
              }
            />
          </>
        )}
      </main>
    </div>
  );
}
