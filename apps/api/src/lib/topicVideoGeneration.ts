/**
 * Compatibility shim — status polling uses reconcileVideoJobStatus.
 */
import { prisma } from './prisma.js';
import { reconcileVideoJobStatus } from './videoPipeline/runPipeline.js';

export {
  buildDefaultScript,
  buildDefaultCues,
  sampleGeneratedVideoUrl,
  syncPublishedVideoToStudents,
} from './topicVideoGeneration.legacy.js';

export async function advanceVideoJob(subtopicId: string) {
  return (await reconcileVideoJobStatus(subtopicId)) ?? prisma.teacherSubtopic.findUnique({ where: { id: subtopicId } });
}
