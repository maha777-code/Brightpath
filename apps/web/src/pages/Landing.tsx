import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, GitFork, TrendingUp, ChevronDown, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { CardStackSection } from '@/components/CardStackSection';
import { CtaBanner } from '@/components/CtaBanner';
import { Footer } from '@/components/Footer';

const SUBJECTS = [
  {
    name: 'Mathematics',
    icon: '%',
    description: 'Algebra, geometry, and problem-solving at every grade.',
  },
  {
    name: 'Computer Science',
    icon: '🖥',
    description: 'Coding, logic, and computational thinking.',
  },
  {
    name: 'Languages',
    icon: '💬',
    description: 'Reading, writing, and conversation practice.',
  },
  {
    name: 'Sciences',
    icon: '⚗',
    description: 'Physics, chemistry, and biology made visual.',
  },
  {
    name: 'Test Prep',
    icon: '⚙',
    description: 'Exam strategies and targeted practice sets.',
  },
  {
    name: 'Study Skills',
    icon: '📋',
    description: 'Notes, revision, and exam-day confidence.',
  },
];

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: TrendingUp,
    title: 'Adaptive Learning',
    description: 'Graphs learning and points',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Checkout 24/7 support',
  },
  {
    icon: GitFork,
    title: 'Personalized Path',
    description: 'Uniquely branching roadmap',
  },
];

function FeatureBanner() {
  return (
    <div className="w-full rounded-2xl border border-cyan-500/30 bg-[#0b0f19]/80 p-6 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-slate-800">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="flex items-center gap-4 px-4 first:pl-0 last:pr-0 md:px-6 md:first:pl-0 md:last:pr-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/60 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
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
          src="/ai-tutor.png?v=3"
          alt="AI Tutor Dynamic Knowledge Model"
          className="h-auto w-full rounded-2xl object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </motion.div>
    </div>
  );
}

type TeacherReview = {
  isPhotoCard: boolean;
  author: string;
  role: string;
  quote?: string;
  handle?: string;
  avatar?: string;
  image?: string;
};

const reviewsData: TeacherReview[] = [
  {
    isPhotoCard: false,
    quote:
      "MindVault was responsive to what teachers needed, not just in features but in how easy it was to use. We're focused on its utility and impact.",
    author: 'Susan U.',
    role: 'Director of Educational Technology',
    avatar: '/reviews/susan-u.jpg',
  },
  {
    isPhotoCard: true,
    author: 'Sarah Jenkins',
    role: 'High School Science Educator',
    image: '/reviews/sarah-jenkins.jpg',
  },
  {
    isPhotoCard: false,
    quote:
      "Tonight was Magical 🪄 @MindVault thank you for a fantastic tool!! It's amazing to see how much time it saves teachers! #TeachersAreMagic",
    author: 'Miss Jami Shields',
    role: 'Middle School Teacher',
    handle: '@MissJShields1',
    avatar: '/reviews/jami-shields.jpg',
  },
  {
    isPhotoCard: false,
    quote:
      "Teachers brought the platform to us and demonstrated a willingness to share their learning with colleagues. We used MindVault because it's built for education.",
    author: 'Teneika B.',
    role: 'Founding Principal',
    avatar: '/reviews/teneika-b.jpg',
  },
  {
    isPhotoCard: true,
    author: 'Marcus Vance',
    role: 'District Tech Coordinator',
    image: '/reviews/marcus-vance.jpg',
  },
];

function TeacherReviewsCarousel() {
  const loopedReviews = [...reviewsData, ...reviewsData];

  return (
    <section
      aria-label="Teacher reviews"
      className="w-full overflow-hidden border-t border-slate-800/60 bg-[#030712] py-16"
    >
      <div className="mb-12 space-y-3 px-4 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          Why teachers love MindVault
        </h2>
        <p className="text-lg text-slate-300">
          Hear from the educators who inspire everything we build.
        </p>
      </div>

      <div className="bp-reviews-mask relative w-full overflow-hidden">
        <div className="bp-reviews-track animate-marquee-reverse flex w-max gap-6 hover:[animation-play-state:paused]">
          {loopedReviews.map((review, idx) => (
            <div
              key={`${review.author}-${idx}`}
              className="flex w-[340px] shrink-0 flex-col justify-between space-y-4 rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-6 shadow-[0_0_25px_rgba(6,182,212,0.1)] backdrop-blur-md transition-colors hover:border-cyan-400 md:w-[380px]"
            >
              {review.isPhotoCard ? (
                <div className="relative h-[280px] w-full overflow-hidden rounded-xl border border-slate-800">
                  <img
                    src={review.image}
                    alt={review.author}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4">
                    <p className="text-lg font-bold text-white">{review.author}</p>
                    <p className="text-sm font-medium text-cyan-400">{review.role}</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="font-serif text-3xl text-cyan-400">“</span>
                    <p className="text-base font-normal leading-relaxed text-slate-200">
                      {review.quote}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 border-t border-slate-800/80 pt-4">
                    {review.avatar ? (
                      <img
                        src={review.avatar}
                        alt={review.author}
                        className="h-10 w-10 rounded-full border border-cyan-500/40 object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <div>
                      <h4 className="text-sm font-bold text-white">{review.author}</h4>
                      <p className="text-xs text-slate-400">{review.role}</p>
                      {review.handle ? (
                        <p className="font-mono text-xs text-cyan-400">{review.handle}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type ToolCard = {
  title: string;
  description: string;
  icon: string;
  bgColor: string;
  borderColor: string;
};

const toolsRow1: ToolCard[] = [
  {
    title: 'Multiple Choice Quiz',
    description: 'Generate a custom multiple choice quiz for any assignment.',
    icon: '📋',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    title: 'Presentation Generator',
    description: 'Generate exportable slides based on any topic, video or text.',
    icon: '📊',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/30',
  },
  {
    title: 'Lesson Plan',
    description: "Generate a lesson plan for a topic or objective you're teaching.",
    icon: '📐',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  {
    title: 'Writing Feedback',
    description: 'Generate feedback on writing based on custom rubrics.',
    icon: '🪶',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
];

const toolsRow2: ToolCard[] = [
  {
    title: 'AI Tutor',
    description: 'Ask questions and get tutored on any topic you are learning.',
    icon: '🍏',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    title: 'Text Rewriter',
    description: 'Take any text and rewrite it with custom criteria.',
    icon: '✏️',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    title: 'Rubric Generator',
    description: 'Generate a custom rubric for any assignment.',
    icon: '📙',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    title: 'Professional Email',
    description: 'Write clear, professional emails to parents and staff.',
    icon: '✉️',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
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
            <div className="flex w-[360px] shrink-0 items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md transition-colors hover:border-cyan-500/50">
              <div
                className={`shrink-0 rounded-xl border p-4 text-3xl ${tool.bgColor} ${tool.borderColor}`}
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
            <span aria-hidden="true" className="shrink-0 text-2xl font-bold text-cyan-400/60">
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
        <div className="w-[min(880px,calc(100vw-2rem))] rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
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
                  NEW THIS MONTH
                </span>
                <div className="mt-3 flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-cyan-500/20 bg-cyan-900/30">
                  <span className="text-4xl">🚀</span>
                </div>
              </div>
              <a
                href="#how-it-works"
                className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-cyan-300 hover:text-white"
              >
                Explore updates →
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
      className="w-full space-y-8 overflow-hidden border-y border-slate-800/60 bg-slate-950 py-16"
    >
      <div className="mb-4 px-4 text-center">
        <h2 className="bp-tools-heading text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          MindVault AI Solutions
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

  return (
    <div className="bp-landing">
      <div className="bp-bg" aria-hidden="true">
        <div className="bp-blob bp-blob--blue" />
        <div className="bp-blob bp-blob--purple" />
        <div className="bp-blob bp-blob--pink" />
      </div>

      <header className="sticky top-0 z-50 w-full overflow-visible border-b border-slate-800/80 bg-[#030712]/80 px-6 backdrop-blur-md lg:px-12">
        <div className="bp-nav mx-auto w-full max-w-[96rem]">
          <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />

          <nav className="bp-nav-center flex items-center space-x-8" aria-label="Main">
            <AiSolutionsMenu />
            <a
              href="#pricing"
              className="text-xl font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              Pricing
            </a>
            <a
              href="#how-it-works"
              className="text-xl font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              For Schools
            </a>
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

          <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--nav">
            Get Started For Free
          </Link>
        </div>
      </header>

      <main>
        <section className="w-full space-y-12 px-4 py-8 sm:px-8 md:px-12 md:py-12 lg:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 flex w-full justify-center lg:col-span-5 lg:order-1 lg:justify-start">
              <HeroAITutorCard />
            </div>
            <div className="bp-hero-copy order-1 flex w-full flex-col items-start space-y-6 text-left lg:col-span-7 lg:order-2">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
                Unlock Your Full Potential with Your Personal AI Tutor
              </h1>
              <p className="max-w-3xl text-xl font-normal leading-relaxed text-slate-200 md:text-2xl">
                Adaptive, 24/7 learning that evolves with you. Master any subject, from Math to
                Mandarin.
              </p>
              <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--lg">
                Start Your Personalized Journey
              </Link>
            </div>
          </div>

          <div aria-label="Key features">
            <FeatureBanner />
          </div>

          <div id="subjects" className="w-full space-y-6">
            <h2 className="text-4xl font-extrabold tracking-tight text-white">Subjects</h2>
            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SUBJECTS.map((s) => (
                <article
                  key={s.name}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-6 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]"
                >
                  <div>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/60 text-xl font-bold text-cyan-400">
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

        <TeacherReviewsCarousel />

        <CtaBanner startHref={startHref} />
      </main>

      <Footer />
    </div>
  );
}
