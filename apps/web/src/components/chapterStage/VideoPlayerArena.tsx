import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from 'lucide-react';
import EukaryoticCellStage from './EukaryoticCellStage';

type Callout = {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
  appearAt: number;
  hideAt: number;
};

type Caption = { start: number; end: number; text: string };

type Props = {
  title: string;
  videoUrl: string;
  callouts: Callout[];
  captions: Caption[];
  quality: string;
  qualityOptions: string[];
  onQualityChange: (q: string) => void;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  captionsOn: boolean;
  onToggleCaptions: () => void;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onVolume: (v: number) => void;
  onMuteToggle: () => void;
  onSkipIntro: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  onTimeTick: (t: number) => void;
  onDuration: (d: number) => void;
  onPlayState: (playing: boolean) => void;
};

export default function VideoPlayerArena({
  title,
  videoUrl,
  callouts,
  captions,
  quality,
  qualityOptions,
  onQualityChange,
  currentTime,
  duration,
  isPlaying,
  volume,
  muted,
  captionsOn,
  onToggleCaptions,
  onTogglePlay,
  onSeek,
  onVolume,
  onMuteToggle,
  onSkipIntro,
  videoRef,
  onTimeTick,
  onDuration,
  onPlayState,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showQuality, setShowQuality] = useState(false);

  const captionText = useMemo(() => {
    const hit = captions.find((c) => currentTime >= c.start && currentTime < c.end);
    return hit?.text ?? '';
  }, [captions, currentTime]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => onTimeTick(v.currentTime);
    const onMeta = () => onDuration(v.duration || duration);
    const onPlay = () => onPlayState(true);
    const onPause = () => onPlayState(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [videoRef, onTimeTick, onDuration, onPlayState, duration]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [videoRef, volume, muted]);

  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => undefined);
      setFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => undefined);
      setFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <h1 className="mb-3 text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[1.65rem]">
        {title}
      </h1>

      <div
        ref={stageRef}
        className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-2xl"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 h-full w-full object-cover opacity-[0.18]"
          playsInline
          crossOrigin="anonymous"
          preload="auto"
        />
        <EukaryoticCellStage
          currentTime={currentTime}
          callouts={callouts}
          captionsOn={captionsOn}
          captionText={captionText}
        />

        <button
          type="button"
          onClick={onSkipIntro}
          className="absolute right-3 top-3 z-30 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/70"
        >
          Skip Intro
        </button>

        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-3 pt-10">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="chapter-scrub mb-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-cyan-400"
            style={{
              background: `linear-gradient(to right, #22d3ee ${progressPct}%, rgba(255,255,255,0.2) ${progressPct}%)`,
            }}
            aria-label="Seek"
          />

          <div className="flex flex-wrap items-center gap-2 text-white sm:gap-3">
            <button
              type="button"
              onClick={onTogglePlay}
              className="rounded-md p-1.5 hover:bg-white/10"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-1.5">
              <button type="button" onClick={onMuteToggle} className="rounded-md p-1.5 hover:bg-white/10">
                {muted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => onVolume(Number(e.target.value))}
                className="h-1 w-16 cursor-pointer accent-cyan-400 sm:w-24"
                aria-label="Volume"
              />
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={onToggleCaptions}
                className={[
                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold tracking-wide',
                  captionsOn ? 'bg-cyan-500/30 text-cyan-100' : 'hover:bg-white/10',
                ].join(' ')}
              >
                CC
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowQuality((s) => !s)}
                  className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-white/10"
                >
                  Quality ({quality})
                </button>
                {showQuality && (
                  <div className="absolute bottom-full right-0 mb-1 min-w-[100px] overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-xl">
                    {qualityOptions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          onQualityChange(q);
                          setShowQuality(false);
                        }}
                        className={[
                          'block w-full px-3 py-1.5 text-left text-xs',
                          q === quality ? 'bg-cyan-500/20 text-cyan-100' : 'hover:bg-white/5',
                        ].join(' ')}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="rounded-md p-1.5 hover:bg-white/10"
                aria-label="Fullscreen"
              >
                {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
