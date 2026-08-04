/** Deepgram Nova-2 — accurate STT (free tier: https://console.deepgram.com/) */
export async function transcribeWithDeepgram(
  audio: Buffer,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const params = new URLSearchParams({
    model: 'nova-2',
    smart_format: 'true',
    language: 'en',
    punctuate: 'false',
    filler_words: 'false',
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'audio/webm',
    },
    body: new Uint8Array(audio),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 250)}`);
  }

  const data = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string; confidence?: number }[] }[] };
    metadata?: { duration?: number };
  };

  const alt = data.results?.channels?.[0]?.alternatives?.[0];
  const text = alt?.transcript?.trim();
  const confidence = alt?.confidence;

  console.log(`[STT] Deepgram raw confidence=${confidence?.toFixed(2) ?? '?'} duration=${data.metadata?.duration ?? '?'}`);

  if (!text) throw new Error('Deepgram returned empty transcript — speak louder or check mic');
  return text;
}
