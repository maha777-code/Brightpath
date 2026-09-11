import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import {
  SONG_GRADE_LEVELS,
  SONG_STYLES,
  SONG_VOICES,
  lyricsPreview,
  type SongLyricsDraft,
  type TeacherSong,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { albumArtDataUrl, upsertLocalSong } from '@/lib/teacherSongs';

function fallbackDraft(topic: string, gradeLevel: string, songStyle: string, customInstructions?: string): SongLyricsDraft {
  const clean = topic.trim() || 'this topic';
  return {
    title: `${clean} Song`,
    lyrics: [
      `Verse 1`,
      `Let's explore ${clean} today,`,
      `${gradeLevel} learners leading the way.`,
      ``,
      `Chorus`,
      `${clean}, ${clean}, sing it true,`,
      `learn the steps and follow through.`,
      `In the style of ${songStyle},`,
      `we remember what we do.`,
    ].join('\n'),
    topic: clean,
    gradeLevel,
    songStyle,
    customInstructions,
  };
}

export default function SongGeneratorCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState(SONG_GRADE_LEVELS[1]);
  const [songStyle, setSongStyle] = useState(SONG_STYLES[0]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [voiceId, setVoiceId] = useState(SONG_VOICES[0].id);
  const [lyricsBusy, setLyricsBusy] = useState(false);
  const [renderBusy, setRenderBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<TeacherSong | null>(null);

  const step1Ready = topic.trim().length > 1 && Boolean(gradeLevel) && Boolean(songStyle);
  const step2Ready = title.trim().length > 1 && lyrics.trim().length > 8;
  const audio = useMemo(
    () => (generated?.audioUrl ? generated.audioUrl : undefined),
    [generated],
  );

  const openStep2 = async () => {
    if (!step1Ready || lyricsBusy) return;
    setLyricsBusy(true);
    setError(null);
    try {
      const draft = await api.generateSongLyrics({
        topic: topic.trim(),
        gradeLevel,
        songStyle,
        customInstructions: customInstructions.trim() || undefined,
      });
      setTitle(draft.title);
      setLyrics(draft.lyrics);
      setStep(2);
    } catch {
      const draft = fallbackDraft(topic, gradeLevel, songStyle, customInstructions);
      setTitle(draft.title);
      setLyrics(draft.lyrics);
      setStep(2);
    } finally {
      setLyricsBusy(false);
    }
  };

  const generateSong = async () => {
    if (!step2Ready || renderBusy) return;
    setRenderBusy(true);
    setError(null);
    const payload = {
      topic: topic.trim(),
      gradeLevel,
      songStyle,
      customInstructions: customInstructions.trim() || undefined,
      title: title.trim(),
      lyrics: lyrics.trim(),
      voiceId,
    };
    try {
      const song = await api.renderSongAudio(payload);
      upsertLocalSong(song);
      setGenerated(song);
      navigate('/teacher/tools/song-generator');
    } catch (err) {
      const voice = SONG_VOICES.find((item) => item.id === voiceId) ?? SONG_VOICES[0];
      const local: TeacherSong = {
        id: crypto.randomUUID(),
        title: payload.title,
        topic: payload.topic,
        lyrics: payload.lyrics,
        lyricsPreview: lyricsPreview(payload.lyrics),
        songStyle,
        gradeLevel,
        voiceId: voice.id,
        voiceLabel: voice.label,
        artUrl: albumArtDataUrl(payload.topic),
        createdAt: new Date().toISOString(),
      };
      upsertLocalSong(local);
      setGenerated(local);
      setError(err instanceof Error ? err.message : 'Saved the song locally.');
      window.setTimeout(() => navigate('/teacher/tools/song-generator'), 700);
    } finally {
      setRenderBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f4f8] text-slate-800">
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-6 sm:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link to="/teacher/tools/song-generator" className="hover:text-slate-800">
              Educational Song Generator
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-800">New song</span>
          </nav>

          {error ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {error}
            </p>
          ) : null}

          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              onClick={() => setStep(1)}
            >
              <div>
                <p className="text-base font-semibold text-slate-900">1. Song lyrics</p>
                <p className="text-sm text-slate-500">Set your topic and style</p>
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-400 ${step === 1 ? 'rotate-180' : ''}`} />
            </button>
            {step === 1 ? (
              <div className="space-y-4 border-t border-slate-100 px-5 py-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Song topic<span className="ml-0.5 text-rose-500">*</span>
                  </span>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Photosynthesis, The Water Cycle, Fractions..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Grade level<span className="ml-0.5 text-rose-500">*</span>
                    </span>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                    >
                      {SONG_GRADE_LEVELS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Song style<span className="ml-0.5 text-rose-500">*</span>
                    </span>
                    <select
                      value={songStyle}
                      onChange={(e) => setSongStyle(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                    >
                      {SONG_STYLES.map((style) => (
                        <option key={style} value={style}>
                          {style}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Custom instructions
                  </span>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Any specific requirements or style preferences for the song?"
                    className="min-h-[96px] w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!step1Ready || lyricsBusy}
                    onClick={() => void openStep2()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {lyricsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-left disabled:opacity-60"
              onClick={() => step1Ready && lyrics && setStep(2)}
              disabled={!lyrics}
            >
              <div>
                <p className="text-base font-semibold text-slate-900">2. Song settings</p>
                <p className="text-sm text-slate-500">Refine lyrics, title, and voice</p>
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-400 ${step === 2 ? 'rotate-180' : ''}`} />
            </button>
            {step === 2 ? (
              <div className="space-y-4 border-t border-slate-100 px-5 py-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-800">Song title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-800">Lyrics</span>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    className="min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-800">Singer voice</span>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                  >
                    {SONG_VOICES.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!step2Ready || renderBusy}
                    onClick={() => void generateSong()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {renderBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate Song
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-slate-500 shadow-sm">
            {audio ? (
              <audio controls src={audio} className="mx-auto w-full max-w-md" />
            ) : (
              <p className="inline-flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Your song will generate here when complete!
              </p>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
