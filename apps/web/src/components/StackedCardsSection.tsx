export interface StackCardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  tag?: string;
}

interface StackedCardsSectionProps {
  id?: string;
  title: string;
  subtitle: string;
  cards: StackCardItem[];
}

export function StackedCardsSection({ id, title, subtitle, cards }: StackedCardsSectionProps) {
  return (
    <section id={id} className="bp-stack-section py-16">
      <div className="bp-stack-head mb-12 space-y-3 text-center">
        <h2 className="bp-stack-title text-3xl font-extrabold uppercase tracking-tight text-white md:text-5xl">
          {title}
        </h2>
        <p className="bp-stack-sub mx-auto max-w-2xl text-lg text-slate-400 md:text-xl">{subtitle}</p>
      </div>

      <div className="bp-stack-list relative mx-auto max-w-5xl">
        {cards.map((card, index) => {
          const topOffset = 96 + index * 20;
          const scale = 1 - (cards.length - 1 - index) * 0.018;

          return (
            <div
              key={card.id}
              className="bp-stack-slot"
              style={{ zIndex: index + 1 }}
            >
              <article
                className="bp-stack-card sticky rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl md:p-12"
                style={{
                  top: `${topOffset}px`,
                  transform: `scale(${scale})`,
                  zIndex: index + 1,
                }}
              >
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-2xl space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="bp-stack-icon flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-950/70 text-4xl text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                        {card.icon}
                      </div>
                      {card.tag ? (
                        <span className="bp-stack-tag rounded-full border border-cyan-500/30 bg-cyan-950/60 px-4 py-1.5 text-sm font-semibold text-cyan-400">
                          {card.tag}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{card.title}</h3>
                    <p className="text-lg leading-relaxed text-slate-300">{card.description}</p>
                  </div>
                  <div className="bp-stack-index hidden h-16 w-16 items-center justify-center rounded-full border border-slate-800 bg-slate-950/80 font-mono text-2xl font-bold text-slate-500 md:flex">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
