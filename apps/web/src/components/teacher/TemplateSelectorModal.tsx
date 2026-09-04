import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import {
  DEFAULT_GENERATION_TEMPLATE_ID,
  GENERATION_TEMPLATES,
  templatesForGenerationType,
  type GenerationTemplate,
  type GenerationTemplateId,
} from '@brightpath/shared';
import { api } from '@/lib/api';

export type GenerationType = 'video' | 'activity';

interface TemplateSelectorModalProps {
  /** @deprecated use generationType */
  kind?: GenerationType;
  generationType: GenerationType;
  subtopicId: string;
  title: string;
  subtitle: string;
  confirmLabel?: string;
  initialTemplateId?: GenerationTemplateId;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    generationType: GenerationType;
    templateId: GenerationTemplateId;
    subtopicId: string;
  }) => void;
}

export default function TemplateSelectorModal({
  kind,
  generationType: generationTypeProp,
  subtopicId,
  title,
  subtitle,
  confirmLabel,
  initialTemplateId,
  submitting = false,
  onClose,
  onConfirm,
}: TemplateSelectorModalProps) {
  const generationType = generationTypeProp ?? kind ?? 'activity';
  const [allTemplates, setAllTemplates] = useState<GenerationTemplate[]>(GENERATION_TEMPLATES);
  const templates = useMemo(
    () => templatesForGenerationType(generationType).filter((t) =>
      allTemplates.some((a) => a.id === t.id),
    ).map((t) => allTemplates.find((a) => a.id === t.id) ?? t),
    [allTemplates, generationType],
  );

  const defaultId =
    (initialTemplateId && templates.some((t) => t.id === initialTemplateId)
      ? initialTemplateId
      : templates[0]?.id) ?? DEFAULT_GENERATION_TEMPLATE_ID;

  const [selected, setSelected] = useState<GenerationTemplateId>(defaultId);

  useEffect(() => {
    setSelected(defaultId);
  }, [defaultId, generationType]);

  useEffect(() => {
    let cancelled = false;
    api
      .listTemplates()
      .then((body) => {
        if (cancelled || !body?.templates?.length) return;
        setAllTemplates(body.templates);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const chosen = templates.find((t) => t.id === selected) ?? templates[0];
  const modeLabel =
    generationType === 'video' ? 'Video Mode · Remotion cinematic presets' : 'Activity Mode · Interactive game presets';
  const actionLabel =
    confirmLabel ??
    (generationType === 'video' ? 'Generate Video with Template' : 'Generate Activity with Template');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
      <div
        className={[
          'max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border p-8 text-white shadow-[0_0_40px_rgba(6,182,212,0.2)]',
          generationType === 'video'
            ? 'border-cyan-400/40 bg-[#0c4a6e]'
            : 'border-amber-400/40 bg-[#1e1b4b]',
        ].join(' ')}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p
              className={[
                'text-sm font-semibold uppercase tracking-wide',
                generationType === 'video' ? 'text-cyan-200' : 'text-amber-200',
              ].join(' ')}
            >
              {modeLabel}
            </p>
            <h3 className="text-2xl font-extrabold">{title}</h3>
            <p className="mt-1 text-base text-cyan-100/80">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 p-2 text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((template) => {
            const active = template.id === selected;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelected(template.id)}
                className={[
                  'rounded-2xl border p-5 text-left transition',
                  active
                    ? generationType === 'video'
                      ? 'border-cyan-300 bg-cyan-400/15 ring-2 ring-cyan-300/70'
                      : 'border-amber-300 bg-amber-400/15 ring-2 ring-amber-300/70'
                    : 'border-white/10 bg-slate-950/40 hover:border-white/30',
                ].join(' ')}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl text-3xl"
                    style={{
                      background: `${template.accent}22`,
                      boxShadow: `inset 0 0 0 2px ${template.accent}`,
                    }}
                  >
                    {template.icon}
                  </span>
                  <div>
                    <p className="text-lg font-extrabold text-white">{template.title}</p>
                    <p className="text-sm font-semibold text-cyan-100/70">{template.subtitle}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-cyan-50/90">{template.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-amber-100/80">
            <span>Currently selected:</span>
            {chosen ? (
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold',
                  generationType === 'video'
                    ? 'bg-cyan-500/25 text-cyan-50'
                    : 'bg-amber-500/25 text-amber-50',
                ].join(' ')}
              >
                <span>{chosen.icon}</span>
                {chosen.title}
              </span>
            ) : (
              <span className="font-bold text-amber-200">None</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !chosen}
              onClick={() =>
                chosen &&
                onConfirm({
                  generationType,
                  templateId: chosen.id,
                  subtopicId,
                })
              }
              className={[
                'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60',
                generationType === 'video'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-[#FBBF24] text-stone-900',
              ].join(' ')}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
