#!/usr/bin/env node
/** Test Gemini API key and list working models. Run: node scripts/test-gemini.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(path.join(root, '.env'));
loadEnv(path.join(root, 'apps/api/.env'));

const key = process.env.GEMINI_API_KEY?.trim();
if (!key) {
  console.error('❌ GEMINI_API_KEY not set in .env or apps/api/.env');
  process.exit(1);
}

console.log('🔑 API key found:', key.slice(0, 8) + '...' + key.slice(-4));

const listRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`,
);
if (!listRes.ok) {
  console.error('❌ List models failed:', listRes.status, await listRes.text());
  process.exit(1);
}

const listData = await listRes.json();
const models = listData.models ?? [];

const flash = models.filter(
  (m) =>
    m.supportedGenerationMethods?.includes('generateContent') &&
    (m.name?.includes('flash') || m.displayName?.toLowerCase().includes('flash')) &&
    !m.name?.includes('image') &&
    !m.name?.includes('live'),
);

console.log('\n✅ Models available for generateContent (flash):');
for (const m of flash) {
  console.log('  -', m.name?.replace('models/', ''), '→', m.displayName);
}

const testModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
console.log(`\n🧪 Testing generateContent with: ${testModel}`);

const genRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${key}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Reply JSON only: {"ok":true}' }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  },
);

if (genRes.ok) {
  const data = await genRes.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('✅ Success! Response:', text);
  console.log(`\n👉 Set in apps/api/.env: GEMINI_MODEL=${testModel}`);
} else {
  console.error('❌ generateContent failed:', genRes.status, await genRes.text());
  if (flash[0]?.name) {
    const alt = flash[0].name.replace('models/', '');
    console.log(`\n💡 Try: GEMINI_MODEL=${alt}`);
  }
  process.exit(1);
}
