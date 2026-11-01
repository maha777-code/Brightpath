export const KHDA_ALIGN_STORAGE_KEY = 'brightpath.khda-align';
const KHDA_ALIGN_EVENT = 'brightpath-khda-align';

export function readKhdaAlign(): boolean {
  try {
    return localStorage.getItem(KHDA_ALIGN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeKhdaAlign(enabled: boolean) {
  localStorage.setItem(KHDA_ALIGN_STORAGE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(KHDA_ALIGN_EVENT));
}

export function subscribeKhdaAlign(onChange: () => void) {
  const notify = () => onChange();
  window.addEventListener('storage', notify);
  window.addEventListener(KHDA_ALIGN_EVENT, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(KHDA_ALIGN_EVENT, notify);
  };
}
