import { useEffect, useMemo, useState } from 'react';
import { arcadePlayPath, type ArcadeAssignmentSummary, type GameArcadeDocument } from '@brightpath/shared';
import { Check, Copy, Download, ExternalLink, Loader2, Send, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { rosterApi, type RosterClass } from '@/lib/rosterApi';
import { arcadeApi } from '@/lib/arcadeApi';
import { TOOL_FIELD, TOOL_HINT, TOOL_PANEL, TOOL_SECONDARY, TOOL_SECTION_TITLE } from '@/components/tools/toolTheme';
import { downloadArcadeHtml } from './arcadeExport';
import { ArcadeLeaderboard } from './ArcadeLeaderboard';
import './arcadeShare.css';

const MANAGER_ROLES = new Set(['teacher', 'org_admin', 'center_admin']);

export function playUrl(assignmentId: string): string {
  return `${window.location.origin}${arcadePlayPath(assignmentId)}`;
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Teacher panel: assign the current pack + game to a class, share its play link, view the board, export HTML. */
export function ArcadeShareBar({ document: doc, game }: { document: GameArcadeDocument; game: { id: string; title: string } }) {
  const { role } = useAuth();
  const canAssign = MANAGER_ROLES.has(role ?? '');
  const [classes, setClasses] = useState<RosterClass[]>([]);
  const [classId, setClassId] = useState('');
  const [assignments, setAssignments] = useState<ArcadeAssignmentSummary[]>([]);
  const [activeId, setActiveId] = useState('');
  const [busy, setBusy] = useState<'assign' | 'export' | 'remove' | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => setConfirmRemove(false), [activeId]);

  useEffect(() => {
    if (!canAssign) return;
    let live = true;
    rosterApi
      .overview()
      .then((res) => {
        if (!live) return;
        setClasses(res.classes);
        setClassId((current) => current || res.classes[0]?.id || '');
      })
      .catch(() => undefined);
    arcadeApi
      .managed()
      .then((res) => {
        if (!live) return;
        setAssignments(res.assignments);
        setActiveId((current) => current || res.assignments[0]?.id || '');
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [canAssign]);

  const active = useMemo(() => assignments.find((item) => item.id === activeId) ?? null, [assignments, activeId]);

  const assign = async () => {
    if (!classId) return;
    setBusy('assign');
    setMessage(null);
    try {
      const { assignment } = await arcadeApi.assign({ classBatchId: classId, gameId: game.id, document: doc });
      setAssignments((prev) => [assignment, ...prev]);
      setActiveId(assignment.id);
      setMessage({ tone: 'ok', text: `Assigned ${game.title} to ${assignment.className}.` });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not assign this game' });
    } finally {
      setBusy(null);
    }
  };

  const exportHtml = async () => {
    setBusy('export');
    setMessage(null);
    try {
      const size = await downloadArcadeHtml({ gameId: game.id, document: doc });
      setMessage({ tone: 'ok', text: `Downloaded ${game.title} as one offline HTML file (${formatBytes(size)}).` });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not build the HTML file' });
    } finally {
      setBusy(null);
    }
  };

  const unassign = async () => {
    if (!active) return;
    const target = active;
    setBusy('remove');
    setMessage(null);
    try {
      await arcadeApi.remove(target.id);
      const rest = assignments.filter((item) => item.id !== target.id);
      setAssignments(rest);
      setActiveId(rest[0]?.id ?? '');
      setMessage({ tone: 'ok', text: `Unassigned “${target.title}” from ${target.className}. Students can no longer open it.` });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not unassign this game' });
    } finally {
      setBusy(null);
      setConfirmRemove(false);
    }
  };

  const copyLink = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(playUrl(active.id));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage({ tone: 'error', text: 'Copy failed. Select the link and copy it manually.' });
    }
  };

  return (
    <div className="space-y-3">
      <div className={`${TOOL_PANEL} arc-share`}>
        <p className={TOOL_SECTION_TITLE}>Share {game.title}</p>
        {canAssign ? (
          <>
            <label className={`${TOOL_HINT} mt-2 block`} htmlFor="arc-share-class">
              Assign to class
            </label>
            {classes.length ? (
              <div className="mt-1 flex gap-2">
                <select
                  id="arc-share-class"
                  className={`${TOOL_FIELD} arc-share__select`}
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} · {cls.studentCount} student{cls.studentCount === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mv-pres-generate arc-share__assign"
                  onClick={() => void assign()}
                  disabled={!classId || busy !== null}
                >
                  {busy === 'assign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Assign
                </button>
              </div>
            ) : (
              <p className={`${TOOL_HINT} mt-1`}>
                <Users className="mr-1 inline h-3.5 w-3.5" />
                Create a class in Classes &amp; Roster to assign games.
              </p>
            )}
          </>
        ) : null}

        {active ? (
          <div className="arc-share__link">
            <p className={TOOL_HINT}>
              Student link · {active.className} · {active.title}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <input className={`${TOOL_FIELD} arc-share__url`} readOnly value={playUrl(active.id)} onFocus={(event) => event.target.select()} />
              <button type="button" className={TOOL_SECONDARY} onClick={() => void copyLink()} aria-label="Copy student link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <a className={`${TOOL_SECONDARY} no-underline`} href={arcadePlayPath(active.id)} target="_blank" rel="noreferrer" aria-label="Open student view">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className={`${TOOL_HINT} mt-1`}>Students sign in and must be enrolled in this class to play.</p>
            {canAssign ? (
              confirmRemove ? (
                <div className="arc-share__confirm" role="alertdialog" aria-label="Confirm unassign">
                  <p>
                    Unassign <strong>{active.title}</strong> from <strong>{active.className}</strong>? Students will no longer
                    see it and the link will stop working. Saved scores are kept.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="arc-share__confirm-btn"
                      data-kind="danger"
                      onClick={() => void unassign()}
                      disabled={busy !== null}
                    >
                      {busy === 'remove' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Unassign
                    </button>
                    <button
                      type="button"
                      className="arc-share__confirm-btn"
                      data-kind="cancel"
                      onClick={() => setConfirmRemove(false)}
                      disabled={busy !== null}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="arc-share__unassign"
                  onClick={() => setConfirmRemove(true)}
                  disabled={busy !== null}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Unassign from class
                </button>
              )
            ) : null}
          </div>
        ) : null}

        <button type="button" className={`${TOOL_SECONDARY} mt-3 w-full justify-center`} onClick={() => void exportHtml()} disabled={busy !== null}>
          {busy === 'export' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download offline HTML
        </button>
        {message ? (
          <p className={`arc-share__msg ${message.tone === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>{message.text}</p>
        ) : null}
      </div>

      {canAssign && assignments.length ? (
        <div className={TOOL_PANEL}>
          {assignments.length > 1 ? (
            <select
              className={`${TOOL_FIELD} arc-share__select mb-2 mt-0`}
              value={activeId}
              onChange={(event) => setActiveId(event.target.value)}
              aria-label="Choose an assigned activity"
            >
              {assignments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.className}
                </option>
              ))}
            </select>
          ) : null}
          {active ? <ArcadeLeaderboard key={active.id} assignmentId={active.id} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export default ArcadeShareBar;
