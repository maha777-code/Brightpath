import { Fragment, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ChevronDown, Languages, Sparkles, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { ThemeToggle } from '@/context/ColorTheme';
import { CardStackSection } from '@/components/CardStackSection';
import { CtaBanner } from '@/components/CtaBanner';
import { Footer } from '@/components/Footer';
import { PricingPreview } from '@/components/landing/PricingPreview';
import { TrustSection } from '@/components/landing/TrustSection';
import { HeroRotatingWord } from '@/components/landing/HeroRotatingWord';

const HERO_AUDIENCES = ['teachers', 'schools', 'students', 'parents'] as const;

/** Light-theme accent colour, mapped to CSS variables in landing.css. */
type Tone =
  | 'blue'
  | 'violet'
  | 'pink'
  | 'green'
  | 'orange'
  | 'teal'
  | 'amber'
  | 'indigo'
  | 'purple'
  | 'sky'
  | 'rose'
  | 'cyan'
  | 'fuchsia';

const SUBJECTS: { name: string; icon: string; description: string; tone: Tone }[] = [
  {
    name: 'Mathematics',
    icon: '%',
    description: 'Algebra, geometry, and problem-solving at every grade.',
    tone: 'blue',
  },
  {
    name: 'Computer Science',
    icon: '🖥',
    description: 'Coding, logic, and computational thinking.',
    tone: 'violet',
  },
  {
    name: 'Languages',
    icon: '💬',
    description: 'Reading, writing, and conversation practice.',
    tone: 'pink',
  },
  {
    name: 'Sciences',
    icon: '⚗',
    description: 'Physics, chemistry, and biology made visual.',
    tone: 'green',
  },
  {
    name: 'Test Prep',
    icon: '⚙',
    description: 'Exam strategies and targeted practice sets.',
    tone: 'orange',
  },
  {
    name: 'Study Skills',
    icon: '📋',
    description: 'Notes, revision, and exam-day confidence.',
    tone: 'teal',
  },
];

const FEATURES: { icon: LucideIcon; title: string; description: string; tone: Tone }[] = [
  {
    icon: BookOpen,
    title: 'Follows your syllabus',
    description: 'Upload a textbook once; every tool uses your chapters',
    tone: 'blue',
  },
  {
    icon: Sparkles,
    title: '11 AI tools, free to start',
    description: 'Lesson plans, quizzes, worksheets, slides, songs and more',
    tone: 'purple',
  },
  {
    icon: Languages,
    title: 'English, Hindi & Arabic',
    description: 'Full interface, including right-to-left layout',
    tone: 'pink',
  },
];

function FeatureBanner() {
  return (
    <div className="bp-feature-banner w-full rounded-2xl border border-cyan-500/30 bg-[#0b0f19]/80 p-6 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-slate-800">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} data-tone={feature.tone} className="flex items-center gap-4 px-4 first:pl-0 last:pr-0 md:px-6 md:first:pl-0 md:last:pr-0">
              <div className="bp-feature-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/60 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                <Icon className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xl font-bold tracking-tight text-slate-100">{feature.title}</h4>
                <p className="mt-1 text-xl font-normal leading-normal text-slate-300">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroAITutorCard() {
  return (
    <div className="group relative w-full">
      <div className="absolute -inset-1 -z-10 animate-pulse rounded-2xl bg-cyan-500/10 blur-xl" />
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/80 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
      >
        <img
          src="/ai-tutor.png?v=4"
          alt="MindVault AI assistant with teaching tools"
          className="h-auto w-full rounded-2xl object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </motion.div>
    </div>
  );
}

const QUIZ_OPTIONS = ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'];

/** Light theme hero: three overlapping, gently floating cards. */
function HeroShowcase({ startHref }: { startHref: string }) {
  return (
    <div className="bp-showcase relative mx-auto aspect-square w-full max-w-[640px]">
      <motion.div
        className="absolute right-0 top-0 z-[1] w-[74%]"
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      >
        <div className="bp-show-card bp-show-photo relative overflow-hidden rounded-[22px]" style={{ ['--tilt' as string]: '3deg' }}>
          <img
            src="/landing/hero-classroom.jpg"
            alt="A teacher and her students working on a laptop together in class"
            className="block aspect-[4/3] h-auto w-full object-cover"
            width={1024}
            height={768}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-blue-800/90 via-blue-600/25 to-transparent" />
          <div className="absolute left-0 top-0 p-5 sm:p-6">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-sky-100">Follows your syllabus</p>
            <p className="mt-1 max-w-[18rem] text-[20px] font-extrabold leading-tight text-[#ffffff] sm:text-[24px]">
              Upload a textbook once. Every tool uses your chapters.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-0 top-[44%] z-[2] w-[56%]"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 0.6 }}
      >
        <div className="bp-show-card bp-show-quiz rounded-[20px] bg-white p-4 sm:p-5" style={{ ['--tilt' as string]: '-4deg' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">Multiple choice quiz · Class 8</p>
          <p className="mt-2 text-[14px] font-bold leading-snug text-slate-900 sm:text-[15px]">
            Which gas do plants release during photosynthesis?
          </p>
          <ul className="mt-3 space-y-1.5">
            {QUIZ_OPTIONS.map((option) => {
              const correct = option === 'Oxygen';
              return (
                <li
                  key={option}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-[13px] ${
                    correct ? 'bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-300' : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  {option}
                  {correct ? <span aria-hidden="true">✓</span> : null}
                </li>
              );
            })}
          </ul>
          <Link to={startHref} className="bp-show-yellow mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold">
            Start free <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[4%] right-0 z-[3] w-[54%]"
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 1.2 }}
      >
        <div className="bp-show-card bp-show-game rounded-[20px] p-4 sm:p-5" style={{ ['--tilt' as string]: '-2deg' }}>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-200">
            <span>Escape room</span>
            <span>🔓 4/4</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-950/60">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-fuchsia-400" />
          </div>
          <p className="mt-4 text-[19px] font-black leading-tight text-[#ffffff] sm:text-[22px]">Mission complete 🏆</p>
          <p className="mt-1 text-[13px] text-indigo-100">Vault unlocked. Every room solved.</p>
        </div>
      </motion.div>
    </div>
  );
}

type ToolCard = {
  title: string;
  description: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  tone: Tone;
};

const toolsRow1: ToolCard[] = [
  {
    title: 'Multiple Choice Quiz',
    description: 'Quizzes written from your topic, standard or attached PDF.',
    icon: '📋',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    tone: 'blue',
  },
  {
    title: 'Presentation Generator',
    description: 'Generate exportable slides based on any topic, video or text.',
    icon: '📊',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/30',
    tone: 'fuchsia',
  },
  {
    title: 'Lesson Plan',
    description: "Generate a lesson plan for a topic or objective you're teaching.",
    icon: '📐',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    tone: 'indigo',
  },
  {
    title: 'Writing Feedback',
    description: 'Generate feedback on writing based on custom rubrics.',
    icon: '🪶',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    tone: 'violet',
  },
  {
    title: 'Worksheet Generator',
    description: 'Printable worksheets from any topic or text.',
    icon: '📝',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    tone: 'green',
  },
  {
    title: 'Curriculum & Textbook Studio',
    description: 'Upload textbooks and syllabi so every tool follows them.',
    icon: '📚',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    tone: 'cyan',
  },
  {
    title: 'Gamified Activity',
    description: 'Turn unit notes into an escape room, a quest, or an XP skill tree.',
    icon: '🎮',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    tone: 'purple',
  },
];

const toolsRow2: ToolCard[] = [
  {
    title: 'Educational Song',
    description: 'Lyrics and a real song on any topic, to the tune you choose.',
    icon: '🎵',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    tone: 'orange',
  },
  {
    title: 'Text Rewriter',
    description: 'Take any text and rewrite it with custom criteria.',
    icon: '✏️',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    tone: 'amber',
  },
  {
    title: 'Educational Podcast',
    description: 'An original podcast episode script with audio.',
    icon: '🎙️',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    tone: 'teal',
  },
  {
    title: 'Email Responder',
    description: 'Clear, professional replies to parents and staff.',
    icon: '✉️',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    tone: 'sky',
  },
  {
    title: 'YouTube Questions',
    description: 'Guiding questions aligned to any YouTube video.',
    icon: '▶️',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    tone: 'rose',
  },
];

function ToolsMarqueeRow({
  tools,
  trackClass,
  animationClass,
}: {
  tools: ToolCard[];
  trackClass: string;
  animationClass: string;
}) {
  const looped = [...tools, ...tools];

  return (
    <div className="bp-reviews-mask relative w-full overflow-hidden">
      <div
        className={`${trackClass} ${animationClass} flex w-max items-center gap-7 hover:[animation-play-state:paused]`}
      >
        {looped.map((tool, idx) => (
          <Fragment key={`${tool.title}-${idx}`}>
            <div
              data-tone={tool.tone}
              className="bp-tool-card relative flex w-[360px] shrink-0 items-center gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md transition-colors hover:border-cyan-500/50"
            >
              <div
                className={`bp-tool-icon shrink-0 rounded-xl border p-4 text-3xl ${tool.bgColor} ${tool.borderColor}`}
              >
                {tool.icon}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="bp-tool-title truncate text-xl font-bold text-white">{tool.title}</h4>
                  <span
                    aria-hidden="true"
                    className="cursor-pointer text-lg text-slate-500 hover:text-amber-400"
                  >
                    ☆
                  </span>
                </div>
                <p className="bp-tool-desc line-clamp-2 text-base leading-snug text-slate-300">
                  {tool.description}
                </p>
              </div>
            </div>
            <span aria-hidden="true" className="bp-tool-sep shrink-0 text-2xl font-bold text-cyan-400/60">
              ✦
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function AiSolutionsMenu() {
  return (
    <div className="bp-mega group relative">
      <button type="button" className="bp-mega-trigger" aria-haspopup="true">
        AI Solutions
        <ChevronDown className="bp-mega-chevron h-4 w-4" aria-hidden="true" />
      </button>

      <div className="bp-mega-panel">
        <div className="w-[min(880px,calc(100vw_-_200px))] rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="mb-8 grid grid-cols-12 gap-8">
            <div className="col-span-8 grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-lg font-bold text-cyan-400">
                  <span className="text-xl">🏛️</span> For Schools
                </div>
                <p className="bp-mega-desc pl-7 text-base leading-relaxed text-slate-300">
                  Empower entire districts with administrative AI, enterprise security, and seamless
                  integration.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-lg font-bold text-cyan-400">
                  <span className="text-xl">📖</span> For Teachers
                </div>
                <p className="bp-mega-desc pl-7 text-base leading-relaxed text-slate-300">
                  Save time, spark creativity, and support every learner.
                </p>
              </div>

              <div className="col-span-2 mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-lg font-bold text-cyan-400">
                  <span className="text-xl">🎓</span> For Students
                </div>
                <p className="bp-mega-desc pl-7 text-base leading-relaxed text-slate-300">
                  Give students the tools to explore, create, and grow with AI.
                </p>
              </div>
            </div>

            <div className="col-span-4 flex flex-col justify-between rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/60 to-slate-900 p-4">
              <div>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                  NEW · BETA
                </span>
                <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-cyan-500/20 bg-cyan-900/30">
                  <img
                    src="/gamified-video.jpg"
                    alt="A textbook PDF turning into a game-style video lesson with stars and quiz coins"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  Turn a PDF into a gamified video or class activity.
                </p>
              </div>
              <a
                href="#ai-solutions"
                className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-cyan-300 hover:text-white"
              >
                Explore the tools →
              </a>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6">
            <p className="bp-mega-why-label mb-4 font-mono text-sm uppercase tracking-wider text-slate-400">
              WHY MINDVAULT
            </p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-3.5">
              <div className="flex items-center gap-2 text-base font-medium text-slate-100">
                <span>🛡️</span> Protect Privacy & Security
              </div>
              <div className="flex items-center gap-2 text-base font-medium text-slate-100">
                <span>💡</span> Build AI Literacy
              </div>
              <div className="flex items-center gap-2 text-base font-medium text-slate-100">
                <span>📈</span> Develop AI Readiness
              </div>
              <div className="flex items-center gap-2 text-base font-medium text-slate-100">
                <span>🎯</span> Support Student Success
              </div>
              <div className="flex items-center gap-2 text-base font-medium text-slate-100">
                <span>⚙️</span> Integrate Quickly
              </div>
              <div className="flex items-center gap-2 text-base font-medium text-slate-100">
                <span>🔗</span> Connect AI Workflows
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiToolsShowcase() {
  return (
    <section
      id="ai-solutions"
      aria-label="MindVault AI Solutions"
      className="bp-tools-section w-full space-y-8 overflow-hidden border-y border-slate-800/60 bg-slate-950 py-16"
    >
      <div className="mb-4 px-4 text-center">
        <h2
          className="bp-tools-heading bp-blob-heading bp-blob-heading--center text-4xl font-extrabold tracking-tight text-white md:text-5xl"
          style={{ ['--blob' as string]: '#c4b5fd' }}
        >
          MindVault <span className="bp-grad-word">AI Solutions</span>
        </h2>
      </div>
      <ToolsMarqueeRow
        tools={toolsRow1}
        trackClass="bp-tools-track"
        animationClass="animate-marquee-left"
      />
      <ToolsMarqueeRow
        tools={toolsRow2}
        trackClass="bp-tools-track-fast"
        animationClass="animate-marquee-left-fast"
      />
    </section>
  );
}

export default function Landing() {
  const { parent } = useAuth();
  const startHref = parent ? '/dashboard' : '/register';
  const loginHref = parent ? '/dashboard' : '/login';

  useEffect(() => {
    if (window.location.hash !== '#pricing') return;
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="bp-landing bp-home">
      <div className="bp-bg" aria-hidden="true">
        <div className="bp-blob bp-blob--blue" />
        <div className="bp-blob bp-blob--purple" />
        <div className="bp-blob bp-blob--pink" />
      </div>

      <header className="sticky top-0 z-50 w-full overflow-visible border-b border-slate-800/80 bg-[#030712]/80 px-6 backdrop-blur-md lg:px-12">
        <div className="bp-nav mx-auto w-full max-w-[1440px]">
          <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />

          <nav className="bp-nav-center flex items-center space-x-8" aria-label="Main">
            <AiSolutionsMenu />
            <Link
              to="/pricing"
              className="text-xl font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              Pricing
            </Link>
            <a
              href="#for-schools"
              className="text-xl font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              For Schools
            </a>
            <Link
              to="/compare"
              className="text-xl font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              Compare
            </Link>
            <Link
              to="/faq"
              className="text-xl font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              FAQs
            </Link>
            <Link
              to="/contact"
              className="text-xl font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              Contact Us
            </Link>
            <Link
              to={loginHref}
              className="text-xl font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              Log In
            </Link>
          </nav>

          <div className="flex items-center justify-self-end gap-3">
            <ThemeToggle />
            <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--nav">
              Get Started For Free
              <span className="bp-btn-arrow" aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="bp-hero-section w-full space-y-12 px-4 py-8 sm:px-8 md:px-12 md:py-12 lg:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 flex w-full justify-center lg:col-span-5 lg:order-1 lg:justify-start">
              <div className="bp-dark-only w-full">
                <HeroAITutorCard />
              </div>
              <div className="bp-light-only w-full">
                <HeroShowcase startHref={startHref} />
              </div>
            </div>
            <div className="bp-hero-copy order-1 flex w-full flex-col items-start space-y-6 text-left lg:col-span-7 lg:order-2">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
                <span className="sr-only">The AI teaching assistant for teachers, schools, students and parents</span>
                <span aria-hidden="true">The AI teaching assistant for</span>{' '}
                <HeroRotatingWord words={HERO_AUDIENCES} />
              </h1>
              <p className="max-w-3xl text-xl font-normal leading-relaxed text-slate-200 md:text-2xl">
                Save time, teach from your own textbook, and support every student with safe,
                syllabus-aligned AI.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--lg">
                  Start Free
                  <span className="bp-btn-arrow" aria-hidden="true">↗</span>
                </Link>
                <Link to="/pricing" className="bp-btn bp-btn--outline bp-btn--accent">
                  See Pricing
                  <span className="bp-btn-arrow" aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>

          <div aria-label="Key features">
            <FeatureBanner />
          </div>

          <div id="subjects" className="w-full space-y-6">
            <h2
              className="bp-blob-heading text-4xl font-extrabold tracking-tight text-white"
              style={{ ['--blob' as string]: '#93c5fd' }}
            >
              <span className="bp-grad-word">Subjects</span>
            </h2>
            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SUBJECTS.map((s) => (
                <article
                  key={s.name}
                  data-tone={s.tone}
                  className="bp-subject-card group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-6 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]"
                >
                  <div>
                    <div className="bp-subject-icon mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/60 text-xl font-bold text-cyan-400">
                      {s.icon}
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-white transition-colors group-hover:text-cyan-300">
                      {s.name}
                    </h3>
                    <p className="mt-2 text-xl font-normal leading-relaxed text-slate-300">{s.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <AiToolsShowcase />

        <CardStackSection />

        <PricingPreview />

        <TrustSection />

        <CtaBanner startHref={startHref} />
      </main>

      <Footer />
    </div>
  );
}
