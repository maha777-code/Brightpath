/** Curated teaching snippets for RAG — expanded in later phases with pgvector. */
export interface KnowledgeChunk {
  id: string;
  subject: string;
  skillTags: string[];
  ageBands: string[];
  content: string;
}

export const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'read-phonics-1',
    subject: 'reading',
    skillTags: ['phonics-consonants', 'phonics-blending'],
    ageBands: ['5-7'],
    content:
      'Phonics teaches letter-sound links. Consonants like B make "buh", M makes "mmm". Blending pushes sounds together: B + A = "ba". Keep answers short — sound or word only for young learners.',
  },
  {
    id: 'read-comp-1',
    subject: 'reading',
    skillTags: ['phonics-blending'],
    ageBands: ['5-7', '8-10'],
    content:
      'When sounding out C-A-T, say each letter sound then blend: "kuh-ah-tuh" → "cat". Praise effort; accept minor spelling if the spoken answer is correct.',
  },
  {
    id: 'math-add-1',
    subject: 'math',
    skillTags: ['addition-within-10'],
    ageBands: ['5-7', '8-10'],
    content:
      'Addition joins groups. For 3 + 2, count all objects or count on from 3: 4, 5. Accept "5" or "five". Use fingers or objects in hints, not abstract symbols only.',
  },
  {
    id: 'math-number-sense',
    subject: 'math',
    skillTags: ['addition-within-10'],
    ageBands: ['5-7'],
    content:
      'Number sense for ages 5–7: keep numbers within 10, use concrete examples (apples, toys). One step at a time.',
  },
  {
    id: 'write-topic-1',
    subject: 'writing',
    skillTags: ['topic-sentence'],
    ageBands: ['8-10', '11-14'],
    content:
      'A topic sentence states the main idea. It often names the subject + opinion or reason. Example: "Winter is my favorite season because we drink hot cocoa." Accept any complete sentence about a season.',
  },
  {
    id: 'tutor-tone',
    subject: 'reading',
    skillTags: [],
    ageBands: ['5-7', '8-10', '11-14', '15-18'],
    content:
      'You are Ms. Bright, a warm private tutor. Use the child\'s name. Short sentences. Celebrate tries. Never shame wrong answers. One concept per message.',
  },
];
