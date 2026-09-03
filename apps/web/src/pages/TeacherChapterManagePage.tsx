import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, GraduationCap, LogOut } from 'lucide-react';
import type { TeacherChapter, TeacherSubtopic } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { SubtopicManager } from '@/components/teacher/SubtopicManager';
import '@/styles/teacher-dashboard.css';

/** Teacher admin view for a single chapter — not the student tutor stage. */
export default function TeacherChapterManagePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { teacher, logout } = useAuth();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<TeacherChapter | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.teacherChapter(id);
      setChapter(res.chapter);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chapter');
      setChapter(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="td-dash min-h-dvh w-full max-w-full text-white">
      <header className="td-header sticky top-0 z-40 w-full">
        <div className="flex h-20 w-full max-w-full items-center gap-4 px-8 lg:px-12">
          <Link
            to="/teacher/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 px-4 py-2 text-base font-medium text-[#A5F3FC] hover:bg-cyan-400/10"
          >
            <ArrowLeft className="h-5 w-5" /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/40 bg-white/5 text-white shadow-[0_0_16px_rgba(34,211,238,0.25)]">
              <GraduationCap className="h-6 w-6 text-white" />
            </span>
            <div>
              <p className="text-base font-extrabold text-white">Chapter admin</p>
              <p className="text-sm font-semibold text-cyan-200/80">Manage videos, activities, and publishing</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-base font-bold text-white sm:block">{teacher?.name ?? 'Teacher'}</p>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#6D28D9]/80 px-6 py-3 text-base font-medium text-white shadow-[0_0_16px_rgba(109,40,217,0.45)] hover:bg-[#7C3AED]"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-full space-y-8 px-8 py-6 lg:px-12 lg:py-8">
        {loading && (
          <p className="td-card rounded-2xl p-8 text-center text-base text-cyan-200/80">Loading chapter…</p>
        )}
        {error && (
          <p className="rounded-2xl border border-rose-400/40 bg-rose-950/50 p-8 text-base font-semibold text-rose-200">
            {error}
          </p>
        )}

        {!loading && chapter && (
          <>
            <section className="td-card rounded-3xl p-8">
              <p className="flex items-center gap-2 text-2xl font-bold text-white">
                <BookOpen className="h-6 w-6 text-[#22D3EE]" />
                {chapter.title}
              </p>
              <p className="mt-2 text-base text-cyan-200/80">{chapter.summary}</p>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-base font-bold text-[#A5F3FC]">
                  <span>Class progress</span>
                  <span>
                    {chapter.completedCount}/{chapter.studentCount} · {chapter.classProgressPct}%
                  </span>
                </div>
                <div className="td-progress-track h-3 overflow-hidden rounded-full">
                  <div
                    className="td-progress-fill h-full rounded-full"
                    style={{ width: `${chapter.classProgressPct}%` }}
                  />
                </div>
              </div>
              <p className="mt-3 text-base font-semibold text-cyan-200/80">
                {chapter.subtopics.length} subtopics · {chapter.videoCount} videos · {chapter.activityCount}{' '}
                activities
              </p>
              {chapter.subtopics.some((s) => s.generatedVideoUrl || s.videoUrl || s.animationCues.length > 0) && (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {chapter.subtopics.map((sub) => {
                    const src = sub.generatedVideoUrl || sub.videoUrl;
                    if (!src && sub.animationCues.length === 0 && !sub.videoScript) return null;
                    return (
                      <div
                        key={sub.id}
                        className="rounded-2xl border border-cyan-400/20 bg-slate-950/40 p-4"
                      >
                        <p className="text-base font-bold text-white">
                          {sub.code} · {sub.title}
                        </p>
                        <p className="mt-1 text-sm text-cyan-200/80">
                          Status: {sub.videoStatus} · {sub.animationCues.length} animation cues
                        </p>
                        {src && (
                          <video
                            src={src}
                            controls
                            playsInline
                            className="mt-3 aspect-video w-full rounded-xl bg-black"
                          />
                        )}
                        {sub.animationCues.length > 0 && (
                          <ul className="mt-3 space-y-1 text-sm text-[#A5F3FC]">
                            {sub.animationCues.slice(0, 6).map((cue, i) => (
                              <li key={`${cue.timeSec}-${i}`}>
                                {cue.timeSec}s — {cue.label}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/chapter/${chapter.id}/explore`}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 px-6 py-3 text-base font-medium text-[#A5F3FC] hover:bg-cyan-400/10"
                >
                  <Eye className="h-5 w-5" /> Preview student view
                </Link>
              </div>
              {note && (
                <p className="mt-4 rounded-xl bg-[#312E81] px-4 py-3 text-base font-semibold text-[#A5F3FC]">
                  {note}
                </p>
              )}
            </section>

            <SubtopicManager
              chapter={chapter}
              onUpdated={() => void load()}
              onPreviewVideo={(sub: TeacherSubtopic) => {
                setNote(
                  sub.videoStatus === 'published'
                    ? `Published video live for students: ${sub.code}`
                    : `Previewing ${sub.code} video explainer`,
                );
              }}
              onAssignActivity={(sub: TeacherSubtopic) => {
                setNote(`Assigned cinematic activity: ${sub.activityTitle ?? sub.title}`);
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
