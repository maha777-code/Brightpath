import type {
  AIResponse,
  StudentDoubt,
  TeacherChapter,
  TeacherSubtopic,
  TeacherUser,
  Textbook,
} from '@brightpath/shared';
import type {
  StudentDoubt as DbDoubt,
  Teacher as DbTeacher,
  TeacherChapter as DbChapter,
  TeacherSubtopic as DbSubtopic,
  Textbook as DbTextbook,
} from '@prisma/client';
import { toAbsolutePublicMediaUrl } from './videoPipeline/mediaPaths.js';

/** Strip legacy Google/MDN demo MP4s so they never reach the teacher review UI. */
function sanitizeTeacherMediaUrl(
  raw: string | null | undefined,
  topicId?: string,
): string | null {
  if (!raw || !String(raw).trim()) return null;
  const value = String(raw).trim();
  if (
    /commondatastorage\.googleapis\.com|gtv-videos-bucket|ForBigger|interactive-examples\.mdn\.mozilla\.net/i.test(
      value,
    )
  ) {
    return null;
  }
  return toAbsolutePublicMediaUrl(value, topicId) ?? value;
}

export function toTeacherUser(t: DbTeacher): TeacherUser {
  return {
    id: t.id,
    email: t.email,
    name: t.name,
    schoolName: t.schoolName,
    subjectFocus: t.subjectFocus,
    createdAt: t.createdAt.toISOString(),
    role: 'teacher',
    planType: ((t as { planType?: TeacherUser['planType'] }).planType ?? 'teacher_pro') as TeacherUser['planType'],
    organizationId: (t as { organizationId?: string | null }).organizationId ?? null,
  };
}

export function toTextbook(t: DbTextbook): Textbook {
  return {
    id: t.id,
    teacherId: t.teacherId,
    title: t.title,
    fileName: t.fileName,
    fileSizeBytes: t.fileSizeBytes,
    subject: t.subject,
    gradeLabel: t.gradeLabel,
    status: t.status,
    pageCount: t.pageCount,
    indexedChunkCount: t.indexedChunkCount,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toSubtopic(s: DbSubtopic): TeacherSubtopic {
  const cuesRaw = (s as { animationCuesJson?: unknown }).animationCuesJson;
  const animationCues = Array.isArray(cuesRaw)
    ? (cuesRaw as TeacherSubtopic['animationCues'])
    : [];
  const manifestRaw = (s as { videoManifestJson?: unknown }).videoManifestJson;
  const videoManifest =
    manifestRaw && typeof manifestRaw === 'object'
      ? (manifestRaw as TeacherSubtopic['videoManifest'])
      : null;

  let videoStatus = ((s as { videoStatus?: TeacherSubtopic['videoStatus'] }).videoStatus ??
    'none') as TeacherSubtopic['videoStatus'];

  const rawGenerated = (s as { generatedVideoUrl?: string | null }).generatedVideoUrl ?? null;
  const rawAudio = (s as { videoAudioUrl?: string | null }).videoAudioUrl ?? null;
  const safeVideoUrl = sanitizeTeacherMediaUrl(s.videoUrl, s.id);
  const safeGenerated = sanitizeTeacherMediaUrl(rawGenerated, s.id);

  // Only treat as published when a real (non-sample) local/public URL exists
  if (videoStatus === 'none' && s.hasVideoExplainer && safeVideoUrl) {
    videoStatus = 'published';
  }

  let resolvedStatus = videoStatus;
  if (resolvedStatus === 'published' && !safeVideoUrl && !safeGenerated) {
    resolvedStatus = 'none';
  }

  return {
    id: s.id,
    chapterId: s.chapterId,
    code: s.code,
    title: s.title,
    sequenceOrder: s.sequenceOrder,
    hasVideoExplainer: Boolean(safeVideoUrl || safeGenerated) && resolvedStatus === 'published',
    hasGamifiedActivity: s.hasGamifiedActivity,
    videoTitle: s.videoTitle,
    activityTitle: s.activityTitle,
    videoUrl: safeVideoUrl,
    videoStatus: resolvedStatus,
    videoProgress: (s as { videoProgress?: number }).videoProgress ?? 0,
    videoJobStage: ((s as { videoJobStage?: TeacherSubtopic['videoJobStage'] }).videoJobStage ??
      null) as TeacherSubtopic['videoJobStage'],
    videoError: (s as { videoError?: string | null }).videoError ?? null,
    generatedVideoUrl: safeGenerated,
    videoAudioUrl: sanitizeTeacherMediaUrl(rawAudio),
    videoScript: (s as { videoScript?: string | null }).videoScript ?? null,
    animationCues,
    videoManifest,
  };
}

export function toChapter(
  c: DbChapter & { subtopics: DbSubtopic[] },
): TeacherChapter {
  return {
    id: c.id,
    textbookId: c.textbookId,
    title: c.title,
    sequenceOrder: c.sequenceOrder,
    summary: c.summary,
    classProgressPct: c.classProgressPct,
    studentCount: c.studentCount,
    completedCount: c.completedCount,
    videoCount: c.subtopics.filter(
      (s) =>
        s.hasVideoExplainer ||
        (s as { videoStatus?: string }).videoStatus === 'published' ||
        (s as { videoStatus?: string }).videoStatus === 'pending_review',
    ).length,

    activityCount: c.subtopics.filter((s) => s.hasGamifiedActivity).length,
    subtopics: c.subtopics
      .slice()
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map(toSubtopic),
  };
}

export function toDoubt(d: DbDoubt): StudentDoubt {
  const aiResponse: AIResponse | null = d.aiAnswerText
    ? {
        id: `ai-${d.id}`,
        doubtId: d.id,
        answerText: d.aiAnswerText,
        groundedSources: d.aiGroundedSources,
        confidence: d.aiConfidence,
        createdAt: d.createdAt.toISOString(),
      }
    : null;

  return {
    id: d.id,
    chapterId: d.chapterId,
    subtopicId: d.subtopicId,
    studentName: d.studentName,
    question: d.question,
    status: d.status,
    aiResponse,
    teacherOverrideText: d.teacherOverrideText,
    pointsAwarded: d.pointsAwarded,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}
