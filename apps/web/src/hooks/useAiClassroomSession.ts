import { useCallback, useEffect, useRef, useState } from 'react';
import {
  formatClock,
  type SummaryNote,
  type TranscriptMessage,
} from '@/types/aiClassroom';

export function useAiClassroomSession(
  learnerName: string,
  opts?: { onTutorSpeak?: (text: string) => void },
) {
  const onTutorSpeakRef = useRef(opts?.onTutorSpeak);
  onTutorSpeakRef.current = opts?.onTutorSpeak;

  const [transcript, setTranscript] = useState<TranscriptMessage[]>(() => [
    {
      id: 'msg-1',
      sender: 'tutor',
      senderName: 'Prof. Spark',
      text: `Hi ${learnerName}! I'm Prof. Spark. Today we'll build water from atoms. Ready?`,
      timestamp: formatClock(),
    },
  ]);

  const [summaryNotes, setSummaryNotes] = useState<SummaryNote[]>(() => [
    {
      id: 'note-1',
      title: 'Atom',
      description: 'Tiny building block made of protons, neutrons & electrons.',
      timestamp: formatClock(),
      category: 'concept',
    },
  ]);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const replyTimers = useRef<number[]>([]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(
    () => () => {
      replyTimers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  // Keep greeting name fresh if learner profile loads after mount
  useEffect(() => {
    setTranscript((prev) => {
      if (prev.length !== 1 || prev[0].id !== 'msg-1') return prev;
      return [
        {
          ...prev[0],
          text: `Hi ${learnerName}! I'm Prof. Spark. Today we'll build water from atoms. Ready?`,
        },
      ];
    });
  }, [learnerName]);

  const appendTranscript = useCallback(
    (
      sender: TranscriptMessage['sender'],
      text: string,
      messageOpts?: { isDoubtTrigger?: boolean; silent?: boolean },
    ) => {
      const msg: TranscriptMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender,
        senderName: sender === 'tutor' ? 'Prof. Spark' : learnerName,
        text,
        timestamp: formatClock(),
        isDoubtTrigger: messageOpts?.isDoubtTrigger,
      };
      setTranscript((prev) => [...prev, msg]);
      if (sender === 'tutor' && !messageOpts?.silent) {
        onTutorSpeakRef.current?.(text);
      }
      return msg;
    },
    [learnerName],
  );

  const addSummaryNote = useCallback(
    (newNote: Omit<SummaryNote, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => {
      setSummaryNotes((prev) => {
        if (prev.some((note) => note.title.toLowerCase() === newNote.title.toLowerCase())) {
          return prev;
        }
        return [
          ...prev,
          {
            id: newNote.id ?? `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: newNote.title,
            description: newNote.description,
            timestamp: newNote.timestamp ?? formatClock(),
            category: newNote.category,
          },
        ];
      });
    },
    [],
  );

  const replyAsTutor = useCallback(
    (text: string, delayMs = 450) => {
      const id = window.setTimeout(() => {
        appendTranscript('tutor', text);
      }, delayMs);
      replyTimers.current.push(id);
      return id;
    },
    [appendTranscript],
  );

  return {
    transcript,
    summaryNotes,
    transcriptEndRef,
    appendTranscript,
    addSummaryNote,
    replyAsTutor,
  };
}
