import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inferConceptVisual } from '@brightpath/shared';
import { buildSrtFromScenes, formatSrtTimestamp } from './overviewSubtitles.js';
import { parseOverviewLengthFromPrompt } from './generateScript.js';

test('SRT timestamps use comma millis', () => {
  assert.equal(formatSrtTimestamp(0), '00:00:00,000');
  assert.equal(formatSrtTimestamp(75.4), '00:01:15,400');
});

test('SRT blocks follow narration clocks', () => {
  const srt = buildSrtFromScenes([
    { duration: 10, voiceoverText: 'Hook from the chapter.' },
    { duration: 12, voiceoverText: 'Here is the interesting part.' },
  ]);
  assert.match(srt, /1\n00:00:00,000 --> 00:00:10,000\nHook from the chapter\./);
  assert.match(srt, /2\n00:00:10,000 --> 00:00:22,000\nHere is the interesting part\./);
});

test('length is only read from an explicit length field', () => {
  assert.equal(parseOverviewLengthFromPrompt('explain this shortly for beginners'), 'standard');
  assert.equal(parseOverviewLengthFromPrompt('length: short\nexplain for beginners'), 'short');
  assert.equal(parseOverviewLengthFromPrompt('length: long'), 'long');
});

test('cube views infer only when the chapter is about solid shapes', () => {
  const visual = inferConceptVisual(
    {
      layout: 'diagram',
      heading: 'Views of a cube',
      bullets: ['Front view is a square', 'Side view is a square', 'Top view is a square'],
    },
    'Visualising Solid Shapes',
  );
  assert.equal(visual.kind, 'views');
  assert.equal(visual.solid, 'cube');
});

test('photosynthesis is a biology cycle, not a cube', () => {
  const visual = inferConceptVisual(
    {
      layout: 'diagram',
      heading: 'Photosynthesis',
      bullets: ['Chloroplast traps light', 'Carbon dioxide enters', 'Glucose is made'],
    },
    'Nutrition in Plants',
    'biology',
  );
  assert.equal(visual.kind, 'cycle');
  assert.equal(visual.solid, undefined);
  assert.equal(visual.subject, 'Photosynthesis');
});

test('Newton force uses a physics field, not a solid', () => {
  const visual = inferConceptVisual(
    {
      layout: 'diagram',
      heading: 'Force and acceleration',
      bullets: ['Force changes motion', 'F = ma', 'Direction matters'],
    },
    'Laws of Motion',
    'physics',
  );
  assert.equal(visual.kind, 'field');
  assert.equal(visual.solid, undefined);
});

test('a history line about the top of a hill is not orthographic views', () => {
  const visual = inferConceptVisual(
    {
      layout: 'bullets',
      heading: 'After the war',
      bullets: ['The king stood at the top', 'He saw grief on every side'],
    },
    'Ashoka',
    'generic',
  );
  assert.notEqual(visual.kind, 'views');
  assert.equal(visual.solid, undefined);
});
