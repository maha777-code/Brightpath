/**
 * Compatibility shim — status polling now reads DB updates from the real pipeline.
 * Kept so older imports of advanceVideoJob continue to work.
 */
import { prisma } from '../prisma.js';
import { isPipelineRunning } from './videoPipeline/runPipeline.js';

export {
  buildDefaultScript,
  buildDefaultCues,
  sampleGeneratedVideoUrl,
  syncPublishedVideoToStudents,
} from './topicVideoGeneration.legacy.js';

export async function advanceVideoJob(subtopicId: string) {
  const sub = await prisma.teacherSubtopic.findUnique({ where: { id: subtopicId } });
  if (!sub) return null;
  // Pipeline worker updates progress; if stuck generating with no worker, report as-is
  if (sub.videoStatus === 'generating' && !isPipelineRunning(subtopicId) && (sub.videoProgress ?? 0) === 0) {
    // no-op — job may be about to start
  }
  return sub;
}
