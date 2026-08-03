/** Deepgram Nova-2 — accurate STT (free tier: https://console.deepgram.com/) */
export async function transcribeWithDeepgram(audio: Buffer, mimeType: string): Promise<string> {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) throw new Error('DEEPGRAM_API_KEY not configured');

  const params = new URLSearchParams({
    model: 'nova-2',
    smart_format: 'true',
    language: 'en',
    punctuate: 'true',
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${key}`,
      'Content-Type': mimeType,
    },
    body: audio,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };

  const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
  if (!text) throw new Error('Deepgram returned empty transcript');
  return text;
}
