import { useCallback, useEffect, useState } from 'react';
import { Compass, RefreshCw } from 'lucide-react';
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
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';

export default function TeacherDashboard() {
  const { teacher, role } = useAuth();
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [chapters, setChapters] = useState<TeacherChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [doubts, setDoubts] = useState<StudentDoubt[]>([]);
  const [previewSubtopic, setPreviewSubtopic] = useState<TeacherSubtopic | null>(null);
  const [engagementNote, setEngagementNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedChapter =
    chapters.find((c) => c.id === selectedChapterId) ??
    [...chapters].sort((a, b) => a.sequenceOrder - b.sequenceOrder)[0] ??
    null;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [structure, current, doubtRes] = await Promise.all([
        api.teacherChapters(),
        api.teacherTextbookCurrent(),
        api.teacherDoubts(),
      ]);
      const nextTextbook = current.textbook ?? structure.textbook;
      setTextbook(nextTextbook);
      setChapters(structure.chapters);
      setDoubts(doubtRes.doubts);
      const chapterOne = [...structure.chapters].sort((a, b) => a.sequenceOrder - b.sequenceOrder)[0];
      setSelectedChapterId((prev) => {
        if (prev && structure.chapters.some((c) => c.id === prev)) return prev;
        return chapterOne?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teacher dashboard');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== 'teacher') return;
    void load();
  }, [role, load]);

  const refreshChapter = async (chapterId: string) => {
    const res = await api.teacherChapter(chapterId);
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? res.chapter : c)));
  };

  const exploreChapter = (ch: TeacherChapter) => {
    setSelectedChapterId(ch.id);
    const withVideo = ch.subtopics.find((s) => s.hasVideoExplainer || s.generatedVideoUrl);
    setPreviewSubtopic(withVideo ?? ch.subtopics[0] ?? null);
    window.requestAnimationFrame(() => {
      document.getElementById('td-enrichment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <TeacherWorkspaceLayout
      actions={
        <>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-cyan-400/30 p-2.5 text-[#A5F3FC] hover:bg-cyan-400/10"
            aria-label="Sync"
            title="Sync"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <a
            href="#td-chapters"
            className="rounded-xl border border-cyan-400/30 p-2.5 text-[#A5F3FC] hover:bg-cyan-400/10"
            aria-label="Explore"
            title="Explore"
          >
            <Compass className="h-5 w-5" />
          </a>
          <div className="hidden text-right sm:block">
            <p className="text-base font-bold text-white">{teacher?.name ?? 'Teacher'}</p>
            <p className="text-sm text-[#A5F3FC]">
              {teacher?.schoolName ?? 'School'} · {teacher?.subjectFocus ?? 'Science'}
            </p>
          </div>
        </>
      }
    >
      <main className="w-full max-w-full space-y-8 px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
        <div className="td-card rounded-3xl p-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Teacher Dashboard</h1>
          <p className="mt-2 text-base text-cyan-200/80">
            Upload textbooks, enrich lessons with video & games, and approve AI answers before class.
          </p>
        </div>

        {loading && (
          <p className="td-card rounded-2xl p-8 text-center text-base text-cyan-200/80">
            Loading curriculum…
          </p>
        )}
        {error && (
          <p className="rounded-2xl border border-rose-400/40 bg-rose-950/50 p-8 text-base font-semibold text-rose-200">
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
                setSelectedChapterId(null);
                setPreviewSubtopic(null);
                setDoubts([]);
                setEngagementNote(`Uploaded “${t.title}” — verify to extract curriculum.`);
                void load({ silent: true });
              }}
              onVerified={async ({ textbook: t, chapters: nextChapters }) => {
                setTextbook(t);
                setSelectedChapterId(null);
                setPreviewSubtopic(null);
                setEngagementNote(`Verified “${t.title}” — curriculum refreshed.`);
                if (nextChapters && nextChapters.length > 0) {
                  setChapters(nextChapters);
                  const first = [...nextChapters].sort((a, b) => a.sequenceOrder - b.sequenceOrder)[0];
                  setSelectedChapterId(first?.id ?? null);
                } else {
                  setChapters([]);
                }
                await load({ silent: true });
              }}
            />

            <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
              <ChapterList
                chapters={chapters}
                selectedId={selectedChapter?.id ?? selectedChapterId}
                onExplore={exploreChapter}
              />
              <SubtopicManager
                key={selectedChapter?.id ?? 'none'}
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
                  setPreviewSubtopic(sub);
                  setEngagementNote(`Assigned cinematic activity: ${sub.activityTitle ?? sub.title}`);
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
    </TeacherWorkspaceLayout>
  );
}
