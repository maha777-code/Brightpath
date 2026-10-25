import { useState, type ReactNode } from 'react';
import { Check, Copy, Download, ExternalLink, Loader2, Sparkles, X } from 'lucide-react';
import {
  GAMIFIED_ACTIVITY_OPTIONS,
  LESSON_PLAN_GRADE_LEVELS,
  getGamifiedActivityOption,
  type BranchingQuestDocument,
  type EscapeRoomDocument,
  type GamifiedActivityKind,
  type GamifiedActivityPayload,
  type GamifiedActivityResponse,
  type SkillTreeDocument,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import {
  documentContext,
  documentImages,
  extractDocumentText,
  type AttachedDocument,
} from '@/lib/extractDocumentText';

const FILE_ACCEPT = '.pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/*';

function fileStem(title: string) {
  return title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'gamified-activity';
}

function downloadText(title: string, content: string, ext: 'md' | 'html', mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileStem(title)}.${ext}`;
  link.click();
  URL.revokeObjectURL(url);
}

function openHtmlPreview(html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function GamifiedActivityGenerator() {
  const [kind, setKind] = useState<GamifiedActivityKind>('escape_room');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('8th grade');
  const [duration, setDuration] = useState('1 week review unit');
  const [files, setFiles] = useState<AttachedDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GamifiedActivityResponse | null>(null);
  const [copied, setCopied] = useState<'html' | 'markdown' | null>(null);

  const option = getGamifiedActivityOption(kind);
  const processing = files.some((file) => file.isProcessing);
  const hasSource =
    topic.trim().length > 0 ||
    files.some((file) => file.extractedText.trim() || Boolean(file.imageDataUrl));
  const canGenerate = hasSource && !processing;

  const attachFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const incoming = Array.from(list).slice(0, 8);
    const placeholders: AttachedDocument[] = incoming.map((file, index) => ({
      id: `${file.name}-${Date.now()}-${index}`,
      name: file.name,
      extractedText: '',
      isProcessing: true,
    }));
    setFiles((prev) => [...prev, ...placeholders]);
    const extracted = await Promise.all(
      incoming.map(async (file, index) => {
        try {
          const parsed = await extractDocumentText(file);
          return {
            ...placeholders[index],
            extractedText: parsed.text,
            imageDataUrl: parsed.imageDataUrl,
            isProcessing: false,
          };
        } catch {
          return { ...placeholders[index], extractedText: '', isProcessing: false };
        }
      }),
    );
    setFiles((prev) =>
      prev.map((file) => extracted.find((item) => item.id === file.id) ?? file),
    );
  };

  const generate = async () => {
    if (!canGenerate || busy) return;
    setBusy(true);
    setError(null);
    const payload: GamifiedActivityPayload = {
      kind,
      topic: topic.trim(),
      gradeLevel,
      subject: subject.trim() || undefined,
      duration: kind === 'skill_tree' ? duration : undefined,
      attachments: files.map((file) => file.name),
      attachedDocumentContext: documentContext(files) || undefined,
      imageFiles: documentImages(files),
    };
    try {
      const next = await api.generateGamifiedActivity(payload);
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate gamified activity.');
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (which: 'html' | 'markdown') => {
    const value = which === 'html' ? result?.html : result?.markdown;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="gamified-activity-tool space-y-6 text-slate-100">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Starter prompt</p>
        <h2 className="mt-1 text-2xl font-extrabold text-white">Gamify an activity</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Attach a unit PDF, Doc, or slides. MindVault extracts key terms, objectives, and misconceptions,
          then builds a playable escape room (single-file HTML), a branching quest, or an XP skill tree.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {GAMIFIED_ACTIVITY_OPTIONS.map((item) => {
          const selected = item.id === kind;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setKind(item.id)}
              className={[
                'rounded-2xl border p-4 text-left transition',
                selected
                  ? 'border-amber-300/70 bg-amber-500/15 ring-2 ring-amber-300/30'
                  : 'border-white/10 bg-slate-950/50 hover:border-amber-300/40',
              ].join(' ')}
            >
              <p className="text-sm font-extrabold text-white">{item.title}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-amber-200/80">
                {item.subtitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
            Subject
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Science, Social Studies, Geometry…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
            Target grade
          </span>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
          >
            {LESSON_PLAN_GRADE_LEVELS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>
      </div>

      {kind === 'skill_tree' ? (
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
            Duration
          </span>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="1 week review unit"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
          Topic / unit notes
        </span>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={5}
          placeholder="Photosynthesis & cellular respiration, Cold War & Cuban Missile Crisis, trigonometric functions…"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
        />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Attach curriculum file
          </p>
          <AddFileMenu onFiles={(list) => void attachFiles(list)} accept={FILE_ACCEPT} />
        </div>
        {files.length ? (
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              >
                <span className="truncate text-cyan-100">
                  {file.isProcessing ? 'Reading… ' : ''}
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((item) => item.id !== file.id))}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">PDF, Docs, slides text, or images. Optional if you pasted a topic.</p>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-sm font-semibold text-rose-100">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void generate()}
        disabled={!canGenerate || busy}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Generating game…' : `Generate ${option.title}`}
      </button>

      {result ? (
        <section className="space-y-4 rounded-3xl border border-amber-400/30 bg-[#1e1b4b]/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-200">
                {getGamifiedActivityOption(result.kind).title} · export to {option.exportHint}
              </p>
              <h3 className="text-xl font-extrabold text-white">{result.document.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.html ? (
                <>
                  <button
                    type="button"
                    onClick={() => openHtmlPreview(result.html!)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-400/10"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open game
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadText(result.document.title, result.html!, 'html', 'text/html')}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-sm font-extrabold text-slate-950"
                  >
                    <Download className="h-4 w-4" />
                    Download HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyText('html')}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    {copied === 'html' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === 'html' ? 'HTML copied' : 'Copy HTML'}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => downloadText(result.document.title, result.markdown, 'md', 'text/markdown')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4" />
                Download Markdown
              </button>
              <button
                type="button"
                onClick={() => void copyText('markdown')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                {copied === 'markdown' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === 'markdown' ? 'Copied' : 'Copy for Docs / Forms'}
              </button>
            </div>
          </div>

          {result.html ? (
            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                Playable HTML game · start screen, 30-minute timer, 4 locked rooms
              </p>
              <iframe
                title="Playable digital escape room"
                srcDoc={result.html}
                sandbox="allow-scripts"
                className="h-[780px] w-full rounded-2xl border border-cyan-400/30 bg-slate-950"
              />
            </section>
          ) : null}

          <Insights insights={result.insights} />
          {result.document.kind === 'escape_room' ? <EscapeRoomView document={result.document} /> : null}
          {result.document.kind === 'branching_quest' ? <QuestView document={result.document} /> : null}
          {result.document.kind === 'skill_tree' ? <SkillTreeView document={result.document} /> : null}
        </section>
      ) : null}
    </div>
  );
}

function Card({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      {eyebrow ? <p className="text-xs font-bold uppercase tracking-wide text-amber-200/80">{eyebrow}</p> : null}
      <h4 className="text-base font-extrabold text-white">{title}</h4>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-cyan-50/90">{children}</div>
    </section>
  );
}

function Insights({
  insights,
}: {
  insights: GamifiedActivityResponse['insights'];
}) {
  return (
    <Card eyebrow="Native context" title="Extracted from the source material">
      <p><span className="font-semibold text-amber-100">Key terms:</span> {insights.keyTerms.join(' · ')}</p>
      <p><span className="font-semibold text-amber-100">Objectives:</span> {insights.learningObjectives.join(' · ')}</p>
      <p><span className="font-semibold text-amber-100">Misconceptions:</span> {insights.misconceptions.join(' · ')}</p>
    </Card>
  );
}

function EscapeRoomView({ document }: { document: EscapeRoomDocument }) {
  const playable = document.playable;
  return (
    <div className="space-y-3">
      <Card eyebrow="Story intro" title={document.theme}>
        <p>
          {document.subject}
          {document.gradeLabel ? ` · ${document.gradeLabel}` : ''}
        </p>
        <p>{document.storyIntro}</p>
        <ul className="list-disc space-y-1 pl-5">
          {document.gameRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Card>
      <Card eyebrow="Student game" title={`${playable.missionName} · ${playable.timerMinutes} minute clock`}>
        <p>
          <span className="font-semibold text-amber-100">Vocabulary:</span>{' '}
          {playable.vocabulary.pairs.map((pair) => pair.term).join(' · ')}
        </p>
        <p>
          <span className="font-semibold text-amber-100">Sequence:</span> {playable.sequence.correctOrder.join('-')}
        </p>
        <p>
          <span className="font-semibold text-amber-100">Data lock:</span>{' '}
          {playable.data.fields.map((field) => `${field.id}=${field.answer}`).join(' · ')}
        </p>
        <p>
          <span className="font-semibold text-amber-100">Mastery:</span>{' '}
          {playable.mastery.options.find((option) => option.correct)?.id ?? 'A'}
        </p>
      </Card>
      {document.stages.map((stage) => (
        <Card key={stage.stage} eyebrow={`Stage ${stage.stage}`} title={stage.title}>
          <p>{stage.puzzle}</p>
          <p className="font-semibold text-amber-100">Hidden clues</p>
          <ul className="list-disc space-y-1 pl-5">
            {stage.hiddenClues.map((clue) => (
              <li key={clue}>{clue}</li>
            ))}
          </ul>
        </Card>
      ))}
      <Card eyebrow="Teacher only" title="Answer key & Forms branching">
        <ul className="space-y-2">
          {document.answerKey.map((row) => (
            <li key={row.stage}>
              <span className="font-bold text-emerald-200">
                Stage {row.stage}: {row.code}
              </span>
              <span className="block text-cyan-100/80">{row.rationale}</span>
            </li>
          ))}
        </ul>
        <ul className="list-disc space-y-1 pl-5">
          {document.formsBranchingNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </Card>
      <Card eyebrow="Early finishers" title={document.extensionActivity.title}>
        <p>{document.extensionActivity.instructions}</p>
      </Card>
    </div>
  );
}

function QuestView({ document }: { document: BranchingQuestDocument }) {
  return (
    <div className="space-y-3">
      <Card eyebrow="Persona" title={document.persona}>
        <p>
          {document.subject}
          {document.gradeLabel ? ` · ${document.gradeLabel}` : ''}
        </p>
        <p>{document.personaBrief}</p>
      </Card>
      {document.decisions.map((decision) => (
        <Card key={decision.id} eyebrow={`Decision ${decision.id}`} title={decision.title}>
          <p>{decision.scene}</p>
          <ul className="space-y-2">
            {decision.choices.map((choice) => (
              <li
                key={choice.id}
                className={[
                  'rounded-xl px-3 py-2',
                  choice.points === 100
                    ? 'bg-emerald-500/15 ring-1 ring-emerald-400/30'
                    : choice.points === 50
                      ? 'bg-amber-500/10 ring-1 ring-amber-300/30'
                      : 'bg-rose-500/10 ring-1 ring-rose-400/30',
                ].join(' ')}
              >
                <p className="font-bold text-white">
                  Choice {choice.id} · {choice.label} · {choice.points} pts
                </p>
                <p>{choice.text}</p>
                <p className="mt-1 text-cyan-100/80">
                  {choice.outcome} — {choice.feedback}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Card eyebrow="Finale" title={document.scorecard.title}>
        <ul className="space-y-2">
          {document.scorecard.bands.map((band) => (
            <li key={band.label}>
              <span className="font-bold text-amber-100">
                {band.min}–{band.max} · {band.label}
              </span>
              <span className="block">{band.meaning}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SkillTreeView({ document }: { document: SkillTreeDocument }) {
  return (
    <div className="space-y-3">
      <Card eyebrow={document.duration} title="Quest rules">
        <p>
          {document.subject} · Target {document.targetXp} XP
        </p>
        <p>{document.unlockRule}</p>
      </Card>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/70 text-amber-100">
            <tr>
              <th className="px-4 py-3 font-bold">Tier</th>
              <th className="px-4 py-3 font-bold">Task</th>
              <th className="px-4 py-3 font-bold">What to do</th>
              <th className="px-4 py-3 font-bold">XP</th>
            </tr>
          </thead>
          <tbody>
            {document.tiers.flatMap((tier) =>
              tier.tasks.map((task) => (
                <tr key={task.id} className="border-t border-white/10 bg-slate-950/30">
                  <td className="px-4 py-3 font-semibold text-amber-100">{tier.name}</td>
                  <td className="px-4 py-3 font-semibold text-white">{task.title}</td>
                  <td className="px-4 py-3 text-cyan-50/90">{task.description}</td>
                  <td className="px-4 py-3 font-bold text-emerald-200">{task.xp}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <Card title="Badges">
        <ul className="space-y-2">
          {document.badges.map((badge) => (
            <li key={badge.name}>
              <span className="font-bold text-amber-100">{badge.name}</span>
              <span className="block">{badge.description}</span>
              <span className="block text-cyan-100/80">Rubric: {badge.rubric}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="XP tracking key">
        <ul className="list-disc space-y-1 pl-5">
          {document.trackingKey.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default GamifiedActivityGenerator;
