// Plain data only (no '@/' imports): vite.config.ts also reads this file to prerender public pages.

export const SITE_URL = 'https://mindvault.academy';
export const SUPPORT_EMAIL = 'qxicybertech.helpcenter@gmail.com';
export const OFFICE_ADDRESS = '130, 1st 7th cross Teachers layout, Nagarabhavi, Bangalore, 560072';

export const TEACHER_TOOL_NAMES = [
  'Lesson Plan Generator',
  'Multiple Choice Quiz / Assessment Generator',
  'Worksheet Generator',
  'Presentation Generator',
  'Writing Feedback Tool',
  'YouTube Video Questions Generator',
  'Text Rewriter',
  'Email Responder / Family Email Generator',
  'Educational Song Generator',
  'Educational Podcast Generator',
  'Curriculum & Textbook Studio',
];

export type FaqItem = { question: string; answer: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Is student data used to train AI models?',
    answer:
      'No. Model training on customer or student data is blocked, and AI requests go to zero-data-retention endpoints. Details are in our Security Overview and Privacy Policy.',
  },
  {
    question: 'Will AI replace the teacher?',
    answer:
      'No. MindVault drafts lesson plans, quizzes, worksheets and emails; the teacher reviews, edits and decides what reaches students. Every output is editable before you use it.',
  },
  {
    question: 'How accurate is the content?',
    answer:
      'AI can make mistakes, so MindVault grounds generation in material you provide. Upload your textbook or syllabus in the Curriculum & Textbook Studio, or attach a PDF to a tool, and questions are written from that text rather than from general internet knowledge.',
  },
  {
    question: 'Does it follow our syllabus and textbooks?',
    answer:
      'Yes. The Curriculum & Textbook Studio (Pro) turns your uploaded textbooks and standards into chapters and topics that the other tools follow.',
  },
  {
    question: 'Can students use it to cheat?',
    answer:
      'Student access is role-based and set up by the school, academy or parent. Teachers create the quizzes and activities, so assessment stays in the teacher’s hands, and students practise in their own workspace with an AI tutor.',
  },
  {
    question: 'Who can see our school’s data?',
    answer:
      'Schools, tutoring centers, teachers, parents and students only see what their role allows. Each school’s data is logically separated, and parent and class links need an invite code.',
  },
  {
    question: 'Which languages are supported?',
    answer: 'The interface is available in English (India and US), Hindi and Arabic, including right-to-left layout.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Ten of the 11 AI tools are free to start; the Curriculum & Textbook Studio is part of Teacher Pro, which is ₹499/month billed yearly (US$9.99). Tutoring-center plans start at ₹1,999/month and school plans at ₹11,999/month, billed yearly. See the pricing page for every plan.',
  },
  {
    question: 'Can we try it before buying for the whole school?',
    answer:
      'Yes. Teachers can sign up free today. For a school or academy rollout, contact us and we will set up a walkthrough for your staff.',
  },
];

export type ComparisonRow = { feature: string; mindvault: string; generic: string };

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Follows your textbook and syllabus',
    mindvault: 'Yes — upload once in the Curriculum & Textbook Studio',
    generic: 'Only what you paste into each chat',
  },
  {
    feature: 'Classroom-ready formats',
    mindvault: 'Lesson plans, quizzes, worksheets, slides, rubric feedback',
    generic: 'Free-form text you reformat yourself',
  },
  {
    feature: 'Audio for lessons',
    mindvault: 'Educational songs and podcasts with real audio',
    generic: 'Usually text only',
  },
  {
    feature: 'Built for schools, parents and students',
    mindvault: 'Separate role-based workspaces with invite codes',
    generic: 'One personal account',
  },
  {
    feature: 'Indian and Gulf classrooms',
    mindvault: 'English, Hindi and Arabic (right-to-left) interface; INR pricing',
    generic: 'Mostly English-first, USD pricing',
  },
  {
    feature: 'Student data and model training',
    mindvault: 'Training on customer and student data is blocked',
    generic: 'Depends on the provider and plan settings',
  },
  {
    feature: 'Price to start',
    mindvault: 'Free plan with 10 AI tools; Pro from ₹499/month',
    generic: 'Free tiers vary; paid plans priced per user',
  },
];

export type TrustFact = { title: string; detail: string };

export const TRUST_FACTS: TrustFact[] = [
  {
    title: 'No training on student data',
    detail: 'Model training on customer and student data is blocked, and AI requests use zero-data-retention endpoints.',
  },
  {
    title: 'Encrypted in transit and at rest',
    detail: 'Traffic uses TLS and stored data is encrypted; passwords are hashed with bcrypt.',
  },
  {
    title: 'Role-based access',
    detail: 'Schools, teachers, parents and students each see only what their role allows.',
  },
  {
    title: 'Transparent pricing',
    detail: 'Every plan and price is published on our pricing page, in INR and USD.',
  },
  {
    title: 'Real people to talk to',
    detail: `Support at ${SUPPORT_EMAIL}, office in Nagarabhavi, Bangalore.`,
  },
];

export type Testimonial = { quote: string; author: string; role: string; organization?: string };

/** Only add quotes from real MindVault users who agreed to be named. The section stays hidden while empty. */
export const TESTIMONIALS: Testimonial[] = [];

export type PublicPage = { path: string; title: string; description: string };

export const PUBLIC_PAGES: PublicPage[] = [
  {
    path: '/',
    title: 'MindVault — AI teaching assistant that follows your syllabus',
    description:
      'Lesson plans, quizzes, worksheets, slides, songs and podcasts grounded in your own textbooks. 11 AI tools for teachers, students, parents and schools. Free to start; Teacher Pro from ₹499/month.',
  },
  {
    path: '/pricing',
    title: 'MindVault pricing — free plans, Teacher Pro, academies and schools',
    description:
      'Published prices for every MindVault plan in INR and USD: free plans for students, teachers and parents, Teacher Pro from ₹499/month, academy plans from ₹1,999/month and school plans from ₹11,999/month.',
  },
  {
    path: '/compare',
    title: 'MindVault vs generic AI chatbots for teaching',
    description:
      'How MindVault differs from general-purpose AI chat tools: syllabus grounding, classroom-ready formats, audio lessons, role-based school workspaces, Hindi and Arabic support, and INR pricing.',
  },
  {
    path: '/contact',
    title: 'Contact MindVault — school demos and support',
    description: `Book a walkthrough for your school or academy, or get support. Email ${SUPPORT_EMAIL} or visit our Bangalore office.`,
  },
  {
    path: '/security',
    title: 'MindVault security overview',
    description:
      'How MindVault protects school and student data: encryption, no model training on student data, zero-data-retention AI requests, role-based access and tenant isolation.',
  },
  {
    path: '/privacy',
    title: 'MindVault privacy policy',
    description: 'How MindVault collects, uses and protects personal and student information.',
  },
  {
    path: '/terms',
    title: 'MindVault terms of service',
    description: 'The terms that govern use of the MindVault platform.',
  },
];
