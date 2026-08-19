/** Default NCERT-style science chapters created after PDF verification / indexing.
 *  Do not seed external sample MP4s — teachers generate real videos via the pipeline.
 */

export const DEFAULT_SCIENCE_CHAPTERS = [
  {
    title: 'Chapter 1: Matter in Our Surroundings',
    summary: 'States of matter, particle nature, and everyday examples.',
    classProgressPct: 62,
    studentCount: 28,
    completedCount: 17,
    subtopics: [
      {
        code: '1.1',
        title: 'Physical Nature of Matter',
        hasVideoExplainer: false,
        hasGamifiedActivity: true,
        videoTitle: 'What is Matter?',
        activityTitle: 'Particle Hunt Mini-Game',
        videoUrl: null,
      },
      {
        code: '1.2',
        title: 'Characteristics of Particles of Matter',
        hasVideoExplainer: false,
        hasGamifiedActivity: false,
        videoTitle: 'Particles Everywhere',
        activityTitle: null,
        videoUrl: null,
      },
      {
        code: '1.3',
        title: 'States of Matter',
        hasVideoExplainer: false,
        hasGamifiedActivity: true,
        videoTitle: null,
        activityTitle: 'Solid–Liquid–Gas Sort',
        videoUrl: null,
      },
    ],
  },
  {
    title: 'Chapter 2: Is Matter Around Us Pure?',
    summary: 'Mixtures, solutions, suspensions, and separation techniques.',
    classProgressPct: 41,
    studentCount: 28,
    completedCount: 11,
    subtopics: [
      {
        code: '2.1',
        title: 'What is a Mixture?',
        hasVideoExplainer: false,
        hasGamifiedActivity: true,
        videoTitle: 'Mixtures Explained',
        activityTitle: 'Mix & Match Lab',
        videoUrl: null,
      },
      {
        code: '2.2',
        title: 'Types of Solutions',
        hasVideoExplainer: false,
        hasGamifiedActivity: true,
        videoTitle: null,
        activityTitle: 'Solution Detective',
        videoUrl: null,
      },
    ],
  },
  {
    title: 'Chapter 3: Atoms and Molecules',
    summary: 'Laws of chemical combination and atomic theory basics.',
    classProgressPct: 18,
    studentCount: 28,
    completedCount: 5,
    subtopics: [
      {
        code: '3.1',
        title: 'Laws of Chemical Combination',
        hasVideoExplainer: false,
        hasGamifiedActivity: false,
        videoTitle: 'Chemical Combination Laws',
        activityTitle: null,
        videoUrl: null,
      },
      {
        code: '3.2',
        title: 'What is an Atom?',
        hasVideoExplainer: false,
        hasGamifiedActivity: true,
        videoTitle: 'Meet the Atom',
        activityTitle: 'Build an Atom',
        videoUrl: null,
      },
    ],
  },
] as const;

export const DEFAULT_SAMPLE_DOUBTS = [
  {
    studentName: 'Aisha',
    question: 'Can we use something other than salt in Activity 1.1?',
    aiAnswerText:
      'Yes. Activity 1.1 demonstrates diffusion. You may use sugar or food colour in water — the textbook uses salt as one common example of particles spreading.',
    aiGroundedSources: ['Ch 1 · Matter in Our Surroundings', 'Activity 1.1'],
    aiConfidence: 0.86,
    status: 'AI_DRAFT' as const,
    chapterIndex: 0,
    subtopicCode: '1.1',
  },
  {
    studentName: 'Rohan',
    question: 'Why do gases fill the entire container but solids do not?',
    aiAnswerText:
      'Gas particles move freely with large spaces between them, so they spread to fill the container. Solid particles are tightly packed and only vibrate in place.',
    aiGroundedSources: ['Ch 1 · States of Matter', '§1.3'],
    aiConfidence: 0.91,
    status: 'AI_DRAFT' as const,
    chapterIndex: 0,
    subtopicCode: '1.3',
  },
  {
    studentName: 'Meera',
    question: 'Is air a pure substance or a mixture?',
    aiAnswerText:
      'Air is a mixture of gases (mainly nitrogen and oxygen) plus water vapour and other gases. It is not a pure substance.',
    aiGroundedSources: ['Ch 2 · Is Matter Around Us Pure?', '§2.1'],
    aiConfidence: 0.93,
    status: 'PENDING' as const,
    chapterIndex: 1,
    subtopicCode: '2.1',
  },
] as const;
