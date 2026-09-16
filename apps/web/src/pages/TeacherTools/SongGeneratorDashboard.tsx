import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Play,
  Plus,
  Search,
} from 'lucide-react';
import type { TeacherSong, TeacherSongsListResponse } from '@brightpath/shared';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  formatCreatedAt,
  formatResetLabel,
  localSongsResponse,
  readLocalSongs,
  removeLocalSong,
  upsertLocalSong,
} from '@/lib/teacherSongs';

const PAGE_SIZE = 10;

function mergeSongs(remote: TeacherSong[], local: TeacherSong[]): TeacherSong[] {
  const seen = new Set(remote.map((item) => item.id));
  return [...remote, ...local.filter((item) => !seen.has(item.id))].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export default function SongGeneratorDashboard() {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TeacherSongsListResponse>(localSongsResponse);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await api.listTeacherSongs();
      const items = mergeSongs(remote.items, readLocalSongs());
      const weekStart = new Date();
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
      weekStart.setHours(0, 0, 0, 0);
      const usedThisWeek = items.filter((item) => new Date(item.createdAt) >= weekStart).length;
      setData({
        ...remote,
        items,
        usedThisWeek,
      });
      setError(null);
    } catch (err) {
      setData(localSongsResponse());
      setError(err instanceof Error ? err.message : 'Showing locally saved songs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.items;
    return data.items.filter((song) =>
      [song.title, song.lyrics, song.songStyle, song.gradeLevel, song.topic]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [data.items, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, page * PAGE_SIZE);
  const atLimit = data.usedThisWeek >= data.weeklyLimit;

  const togglePlay = (song: TeacherSong) => {
    if (!song.audioUrl) return;
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = song.audioUrl;
    void audioRef.current.play();
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(song.id);
  };

  const downloadSong = async (song: TeacherSong) => {
    if (song.audioUrl) {
      const link = document.createElement('a');
      link.href = song.audioUrl;
      link.download = `${song.title.replace(/[^\w\s-]+/g, '').trim() || 'song'}.mp3`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    const blob = new Blob([`${song.title}\n\n${song.lyrics}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${song.title.replace(/[^\w\s-]+/g, '').trim() || 'lyrics'}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const deleteSong = async (song: TeacherSong) => {
    if (!window.confirm(`Delete “${song.title}”?`)) return;
    try {
      await api.deleteTeacherSong(song.id);
    } catch {
      /* local fallback */
    }
    const local = removeLocalSong(song.id);
    setData((prev) => ({
      ...prev,
      items: mergeSongs(
        prev.items.filter((item) => item.id !== song.id),
        local,
      ),
    }));
  };

  return (
    <DashboardLayout>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f4f8] text-slate-800">
        <div className="mx-auto max-w-6xl space-y-5 px-5 py-6 sm:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">
                  Educational Song Generator
                </h1>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Beta
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-[15px] text-slate-500">
                Generate custom lyrics and a song on any topic — to the tune of your choice!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
                {data.usedThisWeek}/{data.weeklyLimit} this week
              </span>
              <button
                type="button"
                className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                onClick={() => window.alert('Thanks — feedback for the song generator is noted.')}
              >
                Give feedback
              </button>
              <button
                type="button"
                onClick={() => navigate('/teacher/tools/song-generator/new')}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5b21b6]"
              >
                <Plus className="h-4 w-4" /> Create
              </button>
            </div>
          </header>

          {atLimit ? (
            <div className="overflow-hidden rounded-xl bg-[#1e293b] text-white shadow-sm">
              <div className="flex gap-3 px-4 py-3 sm:px-5">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                <div className="text-sm leading-relaxed">
                  <p>
                    <span className="font-semibold">Weekly limit reached</span>{' '}
                    You get {data.weeklyLimit} free song{data.weeklyLimit === 1 ? '' : 's'} per
                    week. Resets {formatResetLabel(data.resetsAt)}.
                  </p>
                  <p className="mt-1">
                    Want more usage?{' '}
                    <Link to="/teacher/dashboard" className="font-medium text-sky-300 hover:underline">
                      Upgrade to Plus for {data.plusLimit} songs per week
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {error && !data.items.length ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {error}
            </p>
          ) : null}

          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-800">Songs ({filtered.length})</h2>
              <label className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search songs..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Art</th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        Song <ArrowUpDown className="h-3.5 w-3.5" />
                      </span>
                    </th>
                    <th className="px-4 py-3">Lyrics</th>
                    <th className="px-4 py-3">Song style</th>
                    <th className="px-4 py-3">Grade level</th>
                    <th className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        Created <ArrowDown className="h-3.5 w-3.5" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  ) : pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        No songs yet. Click Create to generate your first song.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((song) => (
                      <tr key={song.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <img
                            src={song.artUrl}
                            alt=""
                            className="h-11 w-11 rounded-md object-cover shadow-sm ring-1 ring-black/5"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => togglePlay(song)}
                            className="inline-flex max-w-[16rem] items-center gap-2 text-left font-semibold text-slate-900"
                          >
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </span>
                            <span className="truncate">{song.title}</span>
                          </button>
                        </td>
                        <td className="max-w-[18rem] px-4 py-3 text-slate-500">
                          <span className="line-clamp-2">{song.lyricsPreview}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{song.songStyle}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{song.gradeLevel}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {formatCreatedAt(song.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-3 text-sm font-medium">
                            <button
                              type="button"
                              className="text-violet-700 hover:underline"
                              onClick={() => void downloadSong(song)}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              className="text-rose-600 hover:underline"
                              onClick={() => void deleteSong(song)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>
                {rangeStart}-{rangeEnd} of {filtered.length}
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1">
                {PAGE_SIZE}/page
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-slate-200 p-1 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="rounded-md border border-slate-200 p-1 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
