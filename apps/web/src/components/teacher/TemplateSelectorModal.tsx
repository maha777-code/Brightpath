import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import {
  DEFAULT_GENERATION_TEMPLATE_ID,
  GENERATION_TEMPLATES,
  type GenerationTemplate,
  type GenerationTemplateId,
} from '@brightpath/shared';
import { api } from '@/lib/api';

interface TemplateSelectorModalProps {
  kind: 'video' | 'activity';
  title: string;
  subtitle: string;
  confirmLabel: string;
  initialTemplateId?: GenerationTemplateId;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (templateId: GenerationTemplateId) => void;
}

export default function TemplateSelectorModal({
  kind,
  title,
  subtitle,
  confirmLabel,
  initialTemplateId,
  submitting = false,
  onClose,
  onConfirm,
}: TemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<GenerationTemplate[]>(GENERATION_TEMPLATES);
  const [selected, setSelected] = useState<GenerationTemplateId>(
    initialTemplateId ?? DEFAULT_GENERATION_TEMPLATE_ID,
  );

  useEffect(() => {
    let cancelled = false;
    api
      .listTemplates()
      .then((body) => {
        if (cancelled || !body?.templates?.length) return;
        setTemplates(body.templates);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const chosen = templates.find((t) => t.id === selected) ?? templates[0];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-cyan-400/30 bg-[#1e1b4b] p-8 text-white shadow-[0_0_40px_rgba(6,182,212,0.2)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
              Select template · {kind === 'video' ? 'Video explainer' : 'Gamified activity'}
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
                    ? 'border-amber-300 bg-amber-400/15 ring-2 ring-amber-300/70'
                    : 'border-white/10 bg-slate-950/40 hover:border-cyan-300/40',
                ].join(' ')}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl text-3xl"
                    style={{ background: `${template.accent}22`, boxShadow: `inset 0 0 0 2px ${template.accent}` }}
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
          <p className="text-sm text-amber-100/80">
            Selected: <span className="font-bold text-amber-200">{chosen?.title}</span>
          </p>
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
              onClick={() => chosen && onConfirm(chosen.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FBBF24] px-5 py-2.5 text-sm font-bold text-stone-900 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
