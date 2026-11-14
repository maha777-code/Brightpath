import { Link } from 'react-router-dom';

type StackCard = {
  id: string;
  anchorId?: string;
  category: string;
  title: string;
  titleLines?: string[];
  features: string[];
  image: string;
  imageAlt: string;
  imageClassName: string;
  imageLeft: boolean;
  eager?: boolean;
  stat?: { value: string; label: string };
  cta: { label: string; href: string; note: string; accent?: boolean };
  /** Light theme: real photo with a coloured overlay. */
  light: { image: string; imageAlt: string; label: string; tone: 'blue' | 'amber' | 'green' };
};

const CARDS: StackCard[] = [
  {
    id: 'schools',
    anchorId: 'for-schools',
    category: 'AI FOR SCHOOLS',
    title: 'One platform for your teachers, students and parents, aligned to your own textbooks.',
    features: [
      'Admin dashboard & analytics',
      'Role-based access with invite codes',
      'Your school’s name and branding',
      'Staff walkthrough on rollout',
    ],
    image: '/safe-ai-tutor-hd.png?v=1',
    imageAlt: 'Safe and secure AI tutor in classroom',
    imageClassName:
      'bp-hd-img aspect-[16/10] h-full w-full object-cover brightness-[1.02] contrast-[1.05] transition-transform duration-700 group-hover:scale-105 [image-rendering:-webkit-optimize-contrast]',
    imageLeft: false,
    eager: true,
    stat: { value: 'From ₹11,999', label: 'per month for a school campus, billed yearly' },
    cta: { label: 'Book a school walkthrough', href: '/contact', note: 'See every school plan on the pricing page.', accent: true },
    light: {
      image: '/landing/schools.jpg',
      imageAlt: 'Students in uniform walking across a school courtyard as the principal greets them',
      label: 'Schools',
      tone: 'blue',
    },
  },
  {
    id: 'teachers',
    anchorId: 'for-teachers',
    category: 'AI FOR TEACHERS',
    title: 'Plan less. Teach more. Follow your syllabus.',
    titleLines: ['Plan less.', 'Teach more.', 'Follow your syllabus.'],
    features: [
      'Lesson plans, quizzes & worksheets',
      'Questions from your own PDFs',
      'Songs & podcasts with real audio',
      'Sharada, your AI assistant',
    ],
    image: '/teacher-hologram.png',
    imageAlt: 'Holographic AI Assistant supporting a teacher in classroom',
    imageClassName: 'aspect-[4/3] h-full w-full object-cover transition-transform duration-700 group-hover:scale-105',
    imageLeft: true,
    stat: { value: '11 AI tools', label: 'free to start, no card needed' },
    cta: { label: 'Start free as a teacher', href: '/register', note: 'Teacher Pro is ₹499/month, billed yearly.' },
    light: {
      image: '/landing/teachers.jpg',
      imageAlt: 'A teacher with a tablet explaining a lesson at the whiteboard as students raise their hands',
      label: 'Teachers',
      tone: 'amber',
    },
  },
  {
    id: 'students',
    anchorId: 'for-students',
    category: 'AI FOR STUDENTS & PARENTS',
    title: 'Learn at your pace. Ask anything. Practise smarter.',
    titleLines: ['Learn at your pace.', 'Ask anything.', 'Practise smarter.'],
    features: [
      'AI tutor for any subject',
      'Videos, quizzes & activities',
      'Parents track progress',
      'English, Hindi & Arabic',
    ],
    image: '/student-hologram.png',
    imageAlt: 'Holographic AI assisting students with interactive learning',
    imageClassName:
      'aspect-[16/10] h-full w-full object-cover transition-transform duration-700 group-hover:scale-105',
    imageLeft: false,
    stat: { value: 'Free', label: 'Student Basic and Parent Basic plans' },
    cta: { label: 'Start learning free', href: '/register', note: 'Student Pro is ₹149/month, billed yearly.' },
    light: {
      image: '/landing/students.jpg',
      imageAlt: 'A student studying with a tablet at home while his mother looks on',
      label: 'Students & Parents',
      tone: 'green',
    },
  },
];

function CardCopy({ card }: { card: StackCard }) {
  return (
    <div className="bp-stack-copy space-y-6">
      <span className="bp-audience-badge text-lg font-bold uppercase tracking-widest text-cyan-400">
        {card.category}
      </span>

      <h3 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
        {card.titleLines
          ? card.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))
          : card.title}
      </h3>

      <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
        {card.features.map((feature) => (
          <div
            key={feature}
            className="bp-audience-item flex items-start gap-3 text-xl font-medium text-slate-200 md:text-2xl"
          >
            <span className="bp-audience-check text-2xl font-bold text-cyan-400">✓</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Link to={card.cta.href} className={`bp-btn bp-btn--primary bp-btn--lg ${card.cta.accent ? 'bp-btn--accent' : ''}`}>
          {card.cta.label}
          <span className="bp-btn-arrow" aria-hidden="true">↗</span>
        </Link>
        <Link to="/pricing" className="text-base font-semibold text-slate-300 underline-offset-4 hover:text-cyan-300 hover:underline">
          {card.cta.note}
        </Link>
      </div>
    </div>
  );
}

function CardShowcase({ card }: { card: StackCard }) {
  return (
    <div className="bp-stack-media group relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/60 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
      <img
        src={card.image}
        alt={card.imageAlt}
        width={1920}
        height={1080}
        loading={card.eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`bp-dark-only ${card.imageClassName}`}
      />
      <img
        src={card.light.image}
        alt={card.light.imageAlt}
        width={1024}
        height={576}
        loading="lazy"
        decoding="async"
        className="bp-light-only aspect-[16/10] h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="bp-stack-overlay bp-light-only" aria-hidden="true" />
      {card.stat ? (
        <div className="bp-stack-stat absolute bottom-4 left-4 right-4 rounded-xl border border-cyan-500/40 bg-slate-950/90 p-4 shadow-xl backdrop-blur-md sm:right-auto sm:max-w-xs">
          <p className="bp-stack-label bp-light-only">{card.light.label}</p>
          <p className="text-2xl font-extrabold text-cyan-400">{card.stat.value}</p>
          <p className="text-base font-medium leading-snug text-slate-200">{card.stat.label}</p>
        </div>
      ) : null}
    </div>
  );
}

export function CardStackSection() {
  return (
    <section id="how-it-works" className="bp-stack-section w-full px-6 py-20 lg:px-12">
      <h2
        className="bp-stack-heading bp-blob-heading bp-blob-heading--center mb-12 w-full text-center text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl"
        style={{ ['--blob' as string]: '#fcd34d' }}
      >
        Made for <span className="bp-grad-word">schools, teachers, students and parents</span>
      </h2>

      <div className="bp-stack-list relative space-y-12 pb-24">
        {CARDS.map((card, index) => {
          const topOffset = 96 + index * 16;

          return (
            <article
              key={card.id}
              id={card.anchorId}
              data-stack-index={index}
              data-tone={card.light.tone}
              style={{ top: `${topOffset}px`, zIndex: index + 1 }}
              className="bp-stack-card sticky overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300 md:p-12"
            >
              <div
                className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                  card.imageLeft ? 'lg:grid-flow-dense' : ''
                }`}
              >
                <div className={card.imageLeft ? 'lg:col-start-2' : undefined}>
                  <CardCopy card={card} />
                </div>
                <div className={card.imageLeft ? 'lg:col-start-1' : undefined}>
                  <CardShowcase card={card} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
