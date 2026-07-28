import type { Locale } from '@brightpath/shared';
import enIN from '../locales/en-IN.json' with { type: 'json' };
import enUS from '../locales/en-US.json' with { type: 'json' };
import hiIN from '../locales/hi-IN.json' with { type: 'json' };
import arAE from '../locales/ar-AE.json' with { type: 'json' };
import arKW from '../locales/ar-KW.json' with { type: 'json' };

export type TranslationKeys = typeof enIN;

export const resources: Record<Locale, { translation: TranslationKeys }> = {
  'en-IN': { translation: enIN },
  'en-US': { translation: enUS },
  'hi-IN': { translation: hiIN },
  'ar-AE': { translation: arAE },
  'ar-KW': { translation: arKW },
};

export { enIN, enUS, hiIN, arAE, arKW };
