import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, GraduationCap, LogOut, RefreshCw } from 'lucide-react';
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
import '@/styles/teacher-dashboard.css';

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
    <div className="td-dash min-h-dvh text-white">
      <header className="td-header sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/40 bg-white/5 text-white shadow-[0_0_16px_rgba(34,211,238,0.25)]">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-white">Brightpath Teacher</p>
              <p className="text-[11px] font-semibold text-cyan-200/80">Curriculum & live doubt control</p>
            </div>
          </div>
          <nav className="mx-auto hidden items-center gap-5 text-sm font-semibold text-[#A5F3FC] md:flex">
            <span className="font-bold text-white">Teacher Dashboard</span>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-cyan-400/30 p-2 text-[#A5F3FC] hover:bg-cyan-400/10"
              aria-label="Sync"
              title="Sync"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <a
              href="#td-chapters"
              className="rounded-xl border border-cyan-400/30 p-2 text-[#A5F3FC] hover:bg-cyan-400/10"
              aria-label="Explore"
              title="Explore"
            >
              <Compass className="h-4 w-4" />
            </a>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-white">{teacher?.name ?? 'Teacher'}</p>
              <p className="text-[11px] text-[#A5F3FC]">
                {teacher?.schoolName ?? 'School'} · {teacher?.subjectFocus ?? 'Science'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9]/80 px-3 py-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(109,40,217,0.45)] hover:bg-[#7C3AED]"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
        <div className="td-card rounded-3xl px-5 py-4">
          <h1 className="text-2xl font-black text-white">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-[#A5F3FC]">
            Upload textbooks, enrich lessons with video & games, and approve AI answers before class.
          </p>
        </div>

        {loading && (
          <p className="td-card rounded-2xl px-4 py-6 text-center text-sm text-[#A5F3FC]">
            Loading curriculum…
          </p>
        )}
        {error && (
          <p className="rounded-2xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-sm font-semibold text-rose-200">
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
                  setEngagementNote(
                    sub.videoStatus === 'published'
                      ? `Published video live for students: ${sub.code}`
                      : `Previewing ${sub.code} video explainer`,
                  );
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
