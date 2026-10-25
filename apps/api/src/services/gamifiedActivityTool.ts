import {
  fallbackInsights,
  gamifiedActivityToMarkdown,
  getGamifiedActivityOption,
  parseGamifiedActivityResponse,
  type GamifiedActivityKind,
  type GamifiedActivityPayload,
  type GamifiedActivityResponse,
  type GamifiedLessonContext,
} from '@brightpath/shared';
import { getActiveProvider, imagePartsFromDataUrls } from '../lib/llm/provider.js';

const TIMEOUT_MS = 70_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function contextFrom(input: GamifiedActivityPayload): GamifiedLessonContext {
  return {
    topic: input.topic.trim() || 'this unit',
    gradeLevel: input.gradeLevel.trim() || 'the uploaded class band',
    subject: input.subject?.trim() || 'Subject',
    duration: input.duration?.trim() || '1 week review unit',
  };
}

function systemPrompt(kind: GamifiedActivityKind): string {
  const option = getGamifiedActivityOption(kind);
  if (kind === 'escape_room') {
    return `Role: Full-Stack Educational Game Designer & Curriculum Specialist.
Task: Gamify the attached learning material into a 4-Stage playable Digital Escape Room.
First extract key terms, learning objectives, and common misconceptions, then build interactive puzzles around those.
Return JSON only. The payload must be complete enough to render a single-file HTML game: start screen, 30-minute timer, four locked rooms, instant feedback, and a victory screen.`;
  }
  if (kind === 'branching_quest') {
    return `Role: Interactive Narrative & Gamification Strategist.
Task: Convert a standard lesson into a multi-choice branching narrative.
First extract key terms, learning objectives, and common misconceptions from the source, then build decisions around those.
Return JSON only. ${option.title} must be ready for a branching Google Doc or Slides deck.`;
  }
  return `Role: Pedagogy & Gamification Architect.
Task: Transform a unit review into a 3-Tiered Skill Tree Choice Board.
First extract key terms, learning objectives, and common misconceptions from the source, then build tasks around those.
Return JSON only. ${option.title} must be grid-ready for Google Docs or Classroom choice boards.`;
}

function userPrompt(kind: GamifiedActivityKind, ctx: GamifiedLessonContext, source: string): string {
  const topic = ctx.topic;
  const grade = ctx.gradeLevel;
  if (kind === 'escape_room') {
    return `Context:
- Subject/Topic: ${ctx.subject} — ${topic}
- Target Grade: ${grade}
- Source Material: attached notes / pasted unit text below

Game Mechanics:
1. Theme & Narrative: Create a high-stakes, age-appropriate storyline. For photosynthesis / cellular respiration, prefer the title "Escape Bio-Dome Alpha: Project Green Horizon".
2. 4 Sequential Rooms (students cannot skip):
   - Stage 1 Vocabulary Match: 4 term/definition pairs for dropdown matching.
   - Stage 2 Sequence Puzzle: 4 process cards labeled A-D whose correct order is B, D, C, A.
   - Stage 3 Data Analysis: a small table plus numeric answers for X, Y, and Z.
   - Stage 4 Mastery Challenge: a flawed scientific claim and 4 multiple-choice repairs, exactly one correct.

Source material:
${source}

Return JSON:
{
  "insights": { "keyTerms": [], "learningObjectives": [], "misconceptions": [] },
  "kind": "escape_room",
  "title": "",
  "theme": "",
  "subject": "${ctx.subject}",
  "gradeLabel": "${grade}",
  "storyIntro": "",
  "gameRules": [],
  "stages": [{ "stage": 1, "title": "Vocabulary Match", "kind": "vocabulary", "puzzle": "", "hiddenClues": [], "lockCode": "ABCD", "validationNote": "" }],
  "playable": {
    "timerMinutes": 30,
    "missionName": "",
    "vocabulary": { "prompt": "", "pairs": [{ "term": "", "definition": "" }] },
    "sequence": { "prompt": "", "cards": [{ "id": "A", "text": "" }], "correctOrder": ["B", "D", "C", "A"] },
    "data": {
      "scenario": "",
      "table": { "headers": [], "rows": [] },
      "fields": [{ "id": "X", "label": "", "answer": "6" }, { "id": "Y", "label": "", "answer": "2" }, { "id": "Z", "label": "", "answer": "0" }]
    },
    "mastery": { "prompt": "", "flawedClaim": "", "options": [{ "id": "A", "text": "", "correct": true }] }
  },
  "answerKey": [{ "stage": 1, "code": "ABCD", "rationale": "" }],
  "formsBranchingNotes": [],
  "extensionActivity": { "title": "", "instructions": "" }
}

Rules: exactly 4 vocabulary pairs, 4 sequence cards A-D with correctOrder B-D-C-A, 3 data fields X/Y/Z, and 4 mastery options with exactly one correct. Ground every puzzle in the source. Include teacher answer key and 1 extension activity.`
  }

  if (kind === 'branching_quest') {
    return `Context:
- Topic: ${ctx.subject} — ${topic}
- Target Grade: ${grade}

Game Rules & Structure:
1. Persona: Assign the student a specific role.
2. Progression: 3 sequential Decision Points. Each offers 3 choices:
   - Choice A: conceptually correct (ideal outcome -> +100 Points).
   - Choice B: partially correct (mixed outcome -> +50 Points).
   - Choice C: misconception-based (failure/retry -> 0 Points).
3. Feedback: explain why the choice led to that outcome using principles from the source.

Source material:
${source}

Return JSON:
{
  "insights": { "keyTerms": [], "learningObjectives": [], "misconceptions": [] },
  "kind": "branching_quest",
  "title": "",
  "subject": "${ctx.subject}",
  "gradeLabel": "${grade}",
  "persona": "",
  "personaBrief": "",
  "decisions": [{ "id": 1, "title": "", "scene": "", "choices": [
    { "id": "A", "label": "Ideal", "text": "", "points": 100, "outcome": "", "feedback": "" },
    { "id": "B", "label": "Partial", "text": "", "points": 50, "outcome": "", "feedback": "" },
    { "id": "C", "label": "Misconception", "text": "", "points": 0, "outcome": "", "feedback": "" }
  ] }],
  "scorecard": { "title": "Achievement Scorecard", "bands": [
    { "min": 250, "max": 300, "label": "Master", "meaning": "" },
    { "min": 150, "max": 249, "label": "Developing", "meaning": "" },
    { "min": 0, "max": 149, "label": "Retry", "meaning": "" }
  ] }
}

Rules: exactly 3 decision points, A/B/C at 100/50/0. Markdown-ready wording for a branching Doc or Slides deck.`;
  }

  return `Context:
- Topic: ${ctx.subject} — ${topic}
- Duration: ${ctx.duration || '1 Week Review Unit'}

Gamification Framework:
1. Point System:
   - Tier 1: Apprentice Tasks (100 XP each) - recall & formula/fact identification.
   - Tier 2: Journeyman Tasks (250 XP each) - multi-step problems & justifications.
   - Tier 3: Master Tasks (500 XP each) - real-world design or peer-teaching video.
2. Unlocking: Students must earn 500 total XP, requiring at least one Tier 2 or Tier 3 task.
3. Badges: 3 unlockable badges with exact rubric conditions.

Source material:
${source}

Return JSON:
{
  "insights": { "keyTerms": [], "learningObjectives": [], "misconceptions": [] },
  "kind": "skill_tree",
  "title": "",
  "subject": "${ctx.subject}",
  "duration": "${ctx.duration || '1 week review unit'}",
  "unlockRule": "Earn 500 XP. At least one Tier 2 or Tier 3 task is required.",
  "targetXp": 500,
  "tiers": [{ "id": 1, "name": "Apprentice Tasks", "xpEach": 100, "tasks": [{ "id": "A1", "title": "", "description": "", "xp": 100 }] }],
  "badges": [{ "name": "", "description": "", "rubric": "" }],
  "trackingKey": []
}

Rules: exactly 3 tiers with exactly 3 tasks each. XP stays 100 / 250 / 500. Tasks must be specific to this unit.`;
}

export async function generateGamifiedActivityTool(
  input: GamifiedActivityPayload,
): Promise<GamifiedActivityResponse> {
  const ctx = contextFrom(input);
  const fallback = parseGamifiedActivityResponse(input.kind, {}, ctx);
  const provider = getActiveProvider();
  if (!provider) return fallback;

  const source = [
    input.topic.trim() ? `Teacher topic notes:\n${input.topic.trim()}` : '',
    input.attachments?.length ? `Attached file names: ${input.attachments.join(', ')}` : '',
    input.attachedDocumentContext?.trim()
      ? `ATTACHED DOCUMENT CONTEXT:\n${input.attachedDocumentContext.trim().slice(0, 20_000)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 22_000) || `${ctx.subject} — ${ctx.topic}`;

  try {
    const raw = await withTimeout(
      provider.completeJson<unknown>({
        system: systemPrompt(input.kind),
        user: userPrompt(input.kind, ctx, source),
        images: imagePartsFromDataUrls(input.imageFiles),
      }),
      TIMEOUT_MS,
      'Gamified activity generation timed out',
    );
    const parsed = parseGamifiedActivityResponse(input.kind, raw, ctx);
    return {
      ...parsed,
      insights: parsed.insights.keyTerms.length ? parsed.insights : fallbackInsights(ctx),
      markdown: gamifiedActivityToMarkdown(parsed.insights, parsed.document),
    };
  } catch (err) {
    console.error('[gamifiedActivityTool] generation failed', err);
    return fallback;
  }
}
