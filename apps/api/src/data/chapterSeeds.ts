/** Public sample videos (short clips for local demos). */
export const SAMPLE_VIDEOS = [
  {
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    durationInSeconds: 6,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    durationInSeconds: 15,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    durationInSeconds: 15,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    durationInSeconds: 60,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    durationInSeconds: 15,
  },
] as const;

export type QuizQuestionSeed = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export function buildChapterQuizQuestions(
  subjectName: string,
  chapterTitle: string,
): QuizQuestionSeed[] {
  return [
    {
      id: 'q1',
      prompt: `What is the main topic of ${chapterTitle}?`,
      options: [subjectName, 'Cooking', 'Sports only', 'Random trivia'],
      correctIndex: 0,
    },
    {
      id: 'q2',
      prompt: 'How should you watch each lesson video?',
      options: [
        'Skip to the end quickly',
        'Watch carefully without fast-forwarding',
        'Mute and ignore it',
        'Watch only the last second',
      ],
      correctIndex: 1,
    },
    {
      id: 'q3',
      prompt: `Which subject are you learning in this chapter?`,
      options: ['Unrelated topic', subjectName, 'None', 'Only games'],
      correctIndex: 1,
    },
    {
      id: 'q4',
      prompt: 'What score do you need to pass a chapter test?',
      options: ['20%', '50%', '80% or higher', '100% only'],
      correctIndex: 2,
    },
    {
      id: 'q5',
      prompt: 'When does the next chapter unlock?',
      options: [
        'Immediately on open',
        'After watching 1 video',
        'After passing this chapter test',
        'Never',
      ],
      correctIndex: 2,
    },
  ];
}

/** 2 chapters × 5 video title templates per subject */
export function chapterTitlesFor(subjectName: string): string[] {
  return [`${subjectName}: Getting Started`, `${subjectName}: Level Up`];
}

export function videoTitlesFor(chapterTitle: string): string[] {
  return [
    `${chapterTitle} — Lesson 1`,
    `${chapterTitle} — Lesson 2`,
    `${chapterTitle} — Lesson 3`,
    `${chapterTitle} — Lesson 4`,
    `${chapterTitle} — Lesson 5`,
  ];
}
