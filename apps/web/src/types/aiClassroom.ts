export interface TranscriptMessage {
  id: string;
  sender: 'tutor' | 'student';
  senderName: string;
  text: string;
  timestamp: string;
  isDoubtTrigger?: boolean;
}

export interface SummaryNote {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category?: 'concept' | 'formula' | 'rule';
}

export function formatClock(date = new Date()): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
