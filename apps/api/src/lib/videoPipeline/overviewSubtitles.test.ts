import assert from 'node:assert/strict';
import { test } from 'node:test';
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
