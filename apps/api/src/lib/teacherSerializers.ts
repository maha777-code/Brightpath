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

  if (videoStatus === 'none' && s.hasVideoExplainer && s.videoUrl) {
    videoStatus = 'published';
  }

  return {
    id: s.id,
    chapterId: s.chapterId,
    code: s.code,
    title: s.title,
    sequenceOrder: s.sequenceOrder,
    hasVideoExplainer: s.hasVideoExplainer || videoStatus === 'published',
    hasGamifiedActivity: s.hasGamifiedActivity,
    videoTitle: s.videoTitle,
    activityTitle: s.activityTitle,
    videoUrl: s.videoUrl,
    videoStatus,
    videoProgress: (s as { videoProgress?: number }).videoProgress ?? 0,
    videoJobStage: ((s as { videoJobStage?: TeacherSubtopic['videoJobStage'] }).videoJobStage ??
      null) as TeacherSubtopic['videoJobStage'],
    videoError: (s as { videoError?: string | null }).videoError ?? null,
    generatedVideoUrl: (s as { generatedVideoUrl?: string | null }).generatedVideoUrl ?? null,
    videoAudioUrl: (s as { videoAudioUrl?: string | null }).videoAudioUrl ?? null,
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
