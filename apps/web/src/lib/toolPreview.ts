/** Template text for the admin sandbox. This does not call a model. */
export function sampleOutput(tool: { id: string; title: string }, topic: string, grade: string): string {
  const subject = topic.trim() || 'your topic';
  const name = tool.title || 'this tool';
  switch (tool.id) {
    case 'song-generator':
      return `Verse 1\nLet's explore ${subject} today,\n${grade} scientists leading the way.\nChorus\nAsk, observe, and try again —\n${subject} clicks when we explain.`;
    case 'podcast-generator':
      return `Host: Welcome to MindVault Classroom. Today we unpack ${subject} for ${grade}.\nGuest: Start with a real-world hook, then one clear model, then a check-for-understanding question.`;
    case 'worksheet-generator':
      return `Worksheet: ${subject} (${grade})\n1. Define ${subject} in your own words.\n2. Give one classroom example.\n3. Explain a common misconception.\n4. Apply it to a short problem.`;
    case 'text-rewriter':
      return `Rewritten for ${grade}:\n${subject} is introduced in plain language, then expanded with one worked example and a stretch question.`;
    case 'lesson-plan':
      return `Lesson plan — ${subject} (${grade})\nObjective: Students can explain ${subject} with an example.\nWarm-up (5m) → Mini-lesson (12m) → Practice (15m) → Exit ticket (8m).`;
    case 'quiz-generator':
      return `Quiz: ${subject}\n1. Which statement best describes ${subject}?\n2. A student mixes up two related ideas. What should they check first?\n3. Apply ${subject} to a ${grade} scenario.`;
    case 'presentation-generator':
      return `Slide 1: ${subject}\nSlide 2: Why it matters for ${grade}\nSlide 3: Core idea\nSlide 4: Worked example\nSlide 5: Check for understanding`;
    case 'writing-feedback':
      return `Feedback on writing about ${subject}:\nStrength: Clear topic sentence.\nNext step: Add one piece of evidence and explain how it supports the claim.`;
    case 'youtube-questions':
      return `Guiding questions for a video on ${subject}:\n1. What problem is the video trying to solve?\n2. Pause at the model — what changed?\n3. How would you teach this to a classmate?`;
    case 'family-email':
      return `Subject: Update on ${subject}\nHello families,\nThis week we are studying ${subject} in ${grade}. Students will practice with a short activity and a check-in. Thank you for supporting learning at home.`;
    default:
      return `Ready to generate ${name.toLowerCase()} for ${subject}.`;
  }
}
