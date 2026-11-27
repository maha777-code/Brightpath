import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Download, ExternalLink, Loader2, Sparkles, Star, X } from 'lucide-react';
import {
  GAMIFIED_ACTIVITY_OPTIONS,
  LESSON_PLAN_GRADE_LEVELS,
  getGamifiedActivityOption,
  type BranchingQuestDocument,
  type EscapeRoomDocument,
  type GameArcadeDocument,
  type GamifiedActivityKind,
  type GamifiedActivityPayload,
  type GamifiedActivityResponse,
  type SkillTreeDocument,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { ToolErrorRetry } from '@/components/tools/ToolErrorRetry';
import { GameArcade } from '@/components/games/arcade/GameArcade';
import { ArcadeShareBar } from '@/components/games/arcade/ArcadeShareBar';
import {
  TOOL_ACCENT_BUTTON,
  TOOL_BREADCRUMB,
  TOOL_BREADCRUMB_LINK,
  TOOL_CARD,
  TOOL_CHOICE,
  TOOL_FIELD,
  TOOL_GENERATE,
  TOOL_HINT,
  TOOL_ICON_BUTTON,
  TOOL_LABEL,
  TOOL_MUTED,
  TOOL_PAGE,
  TOOL_PANEL,
  TOOL_SECONDARY,
  TOOL_SECTION_TITLE,
  TOOL_SUBTITLE,
  TOOL_TEXTAREA_SHORT,
  TOOL_TITLE,
} from '@/components/tools/toolTheme';
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
  const [kind, setKind] = useState<GamifiedActivityKind>('game_arcade');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('8th grade');
  const [duration, setDuration] = useState('1 week review unit');
  const [files, setFiles] = useState<AttachedDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GamifiedActivityResponse | null>(null);
  const [copied, setCopied] = useState<'html' | 'markdown' | null>(null);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    void api
      .teacherTools()
      .then((res) => setFavorited(res.favoriteIds.includes('gamified-activity')))
      .catch(() => undefined);
  }, []);

  const toggleFavorite = () => {
    setFavorited((value) => !value);
    void api.toggleTeacherToolFavorite('gamified-activity').then((res) => setFavorited(res.favorited)).catch(() => undefined);
  };

  const showExemplar = () => {
    setSubject('Science');
    setGradeLevel('8th grade');
    setTopic('Photosynthesis & cellular respiration: inputs, outputs, where each happens in the cell, and how the two processes depend on each other.');
  };

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
      setResult(null);
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
    <div className={TOOL_PAGE}>
      <nav className={TOOL_BREADCRUMB}>
        <Link to="/teacher/tools" className={TOOL_BREADCRUMB_LINK}>Teacher Tools</Link>
        <span className={TOOL_MUTED}>›</span>
        <span>Gamified Activity</span>
      </nav>
      <div className={TOOL_CARD}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={TOOL_TITLE}>
              Gamified Activity
              <button
                type="button"
                className={TOOL_ICON_BUTTON}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={favorited}
                onClick={toggleFavorite}
              >
                <Star className={`h-5 w-5 ${favorited ? 'fill-amber-300 text-amber-300' : TOOL_MUTED}`} />
              </button>
            </h1>
            <p className={TOOL_SUBTITLE}>
              Attach a unit PDF, Doc, or slides. MindVault extracts key terms, objectives, and misconceptions,
              then builds a real arcade game, a playable escape room (single-file HTML), a branching quest, or an XP
              skill tree.
            </p>
          </div>
          <button type="button" className={TOOL_ACCENT_BUTTON} onClick={showExemplar}>
            Show exemplar
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {GAMIFIED_ACTIVITY_OPTIONS.map((item) => {
            const selected = item.id === kind;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                data-active={selected ? 'true' : 'false'}
                onClick={() => setKind(item.id)}
                className={TOOL_CHOICE}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className={`${TOOL_MUTED} mt-1 text-xs`}>{item.subtitle}</p>
                <p className={`${TOOL_MUTED} mt-2 text-xs leading-relaxed`}>{item.description}</p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={TOOL_LABEL} htmlFor="gamified-subject">Subject:</label>
            <input
              id="gamified-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Science, Social Studies, Geometry…"
              className={TOOL_FIELD}
            />
          </div>
          <div>
            <label className={TOOL_LABEL} htmlFor="gamified-grade">Target grade: *</label>
            <select
              id="gamified-grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className={TOOL_FIELD}
            >
              {LESSON_PLAN_GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>

        {kind === 'skill_tree' ? (
          <>
            <label className={TOOL_LABEL} htmlFor="gamified-duration">Duration:</label>
            <input
              id="gamified-duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="1 week review unit"
              className={TOOL_FIELD}
            />
          </>
        ) : null}

        <label className={TOOL_LABEL} htmlFor="gamified-topic">Topic or unit notes:</label>
        <div className="relative">
          <textarea
            id="gamified-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={5}
            placeholder="Photosynthesis & cellular respiration, Cold War & Cuban Missile Crisis, trigonometric functions…"
            className={TOOL_TEXTAREA_SHORT}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <AddFileMenu onFiles={(list) => void attachFiles(list)} accept={FILE_ACCEPT} />
          <span className={TOOL_HINT}>PDF, Docs, slides text, or images. Optional if you pasted a topic.</span>
        </div>
        {files.length ? (
          <ul className="mt-3 space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="mv-pres-field flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {file.isProcessing ? 'Reading… ' : ''}
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((item) => item.id !== file.id))}
                  className={TOOL_ICON_BUTTON}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <ToolErrorRetry message={error} busy={busy} onRetry={canGenerate ? () => void generate() : null} />

        <button
          type="button"
          onClick={() => void generate()}
          disabled={!canGenerate || busy}
          className={TOOL_GENERATE}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? 'Generating game…' : `Generate ${option.title}`}
        </button>
      </div>

      {result ? (
        <section className={`${TOOL_CARD} mt-6 space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={TOOL_HINT}>
                {getGamifiedActivityOption(result.kind).title} · {getGamifiedActivityOption(result.kind).exportHint}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{result.document.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.html ? (
                <>
                  <button type="button" onClick={() => openHtmlPreview(result.html!)} className={TOOL_SECONDARY}>
                    <ExternalLink className="h-4 w-4" />
                    Open game
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadText(result.document.title, result.html!, 'html', 'text/html')}
                    className={TOOL_SECONDARY}
                  >
                    <Download className="h-4 w-4" />
                    Download HTML
                  </button>
                  <button type="button" onClick={() => void copyText('html')} className={TOOL_SECONDARY}>
                    {copied === 'html' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === 'html' ? 'HTML copied' : 'Copy HTML'}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => downloadText(result.document.title, result.markdown, 'md', 'text/markdown')}
                className={TOOL_SECONDARY}
              >
                <Download className="h-4 w-4" />
                Download Markdown
              </button>
              <button type="button" onClick={() => void copyText('markdown')} className={TOOL_SECONDARY}>
                {copied === 'markdown' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === 'markdown' ? 'Copied' : 'Copy for Docs / Forms'}
              </button>
            </div>
          </div>

          {result.html ? (
            <section className="space-y-3">
              <h3 className={TOOL_SECTION_TITLE}>
                Playable HTML game · start screen, 30-minute timer, 4 locked rooms
              </h3>
              <iframe
                title="Playable digital escape room"
                srcDoc={result.html}
                sandbox="allow-scripts"
                className="mv-pres-field h-[780px] w-full rounded-2xl"
              />
            </section>
          ) : null}

          {result.document.kind === 'game_arcade' ? (
            <GameArcade
              document={result.document}
              insights={result.insights}
              renderTeacherPanel={(game) => (
                <ArcadeShareBar document={result.document as GameArcadeDocument} game={game} />
              )}
            />
          ) : (
            <Insights insights={result.insights} />
          )}
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
    <section className={TOOL_PANEL}>
      {eyebrow ? <p className={TOOL_HINT}>{eyebrow}</p> : null}
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
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
      <p><span className="font-semibold">Key terms:</span> {insights.keyTerms.join(' · ')}</p>
      <p><span className="font-semibold">Objectives:</span> {insights.learningObjectives.join(' · ')}</p>
      <p><span className="font-semibold">Misconceptions:</span> {insights.misconceptions.join(' · ')}</p>
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
          <span className="font-semibold">Vocabulary:</span>{' '}
          {playable.vocabulary.pairs.map((pair) => pair.term).join(' · ')}
        </p>
        <p>
          <span className="font-semibold">Sequence:</span> {playable.sequence.correctOrder.join('-')}
        </p>
        <p>
          <span className="font-semibold">Data lock:</span>{' '}
          {playable.data.fields.map((field) => `${field.id}=${field.answer}`).join(' · ')}
        </p>
        <p>
          <span className="font-semibold">Mastery:</span>{' '}
          {playable.mastery.options.find((option) => option.correct)?.id ?? 'A'}
        </p>
      </Card>
      {document.stages.map((stage) => (
        <Card key={stage.stage} eyebrow={`Stage ${stage.stage}`} title={stage.title}>
          <p>{stage.puzzle}</p>
          <p className="font-semibold">Hidden clues</p>
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
              <span className="mv-pres-accent font-semibold">
                Stage {row.stage}: {row.code}
              </span>
              <span className="block mv-pres-muted">{row.rationale}</span>
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
                data-active={choice.points === 100 ? 'true' : 'false'}
                className="mv-tool-choice rounded-xl px-3 py-2"
              >
                <p className="font-semibold">
                  Choice {choice.id} · {choice.label} · {choice.points} pts
                </p>
                <p>{choice.text}</p>
                <p className="mt-1 mv-pres-muted">
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
              <span className="font-semibold">
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
      <div className="mv-pres-field overflow-x-auto rounded-xl">
        <table className="min-w-full text-left text-sm">
          <thead className={TOOL_MUTED}>
            <tr>
              <th className="px-4 py-3 font-semibold">Tier</th>
              <th className="px-4 py-3 font-semibold">Task</th>
              <th className="px-4 py-3 font-semibold">What to do</th>
              <th className="px-4 py-3 font-semibold">XP</th>
            </tr>
          </thead>
          <tbody>
            {document.tiers.flatMap((tier) =>
              tier.tasks.map((task) => (
                <tr key={task.id} className="border-t border-slate-500/20">
                  <td className="px-4 py-3 font-semibold">{tier.name}</td>
                  <td className="px-4 py-3 font-semibold">{task.title}</td>
                  <td className="px-4 py-3">{task.description}</td>
                  <td className="mv-pres-accent px-4 py-3 font-semibold">{task.xp}</td>
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
              <span className="font-semibold">{badge.name}</span>
              <span className="block">{badge.description}</span>
              <span className="block mv-pres-muted">Rubric: {badge.rubric}</span>
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
