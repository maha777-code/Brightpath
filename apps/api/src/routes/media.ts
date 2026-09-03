import { Router, type NextFunction, type Response } from 'express';
import fs from 'node:fs';
import multer from 'multer';
import type { AuthRequest } from '../middleware/auth.js';
import { detectAttachmentKind } from '../lib/media/extractAttachmentText.js';
import {
  ATTACHMENT_UPLOAD_DIR,
  ingestSubtopicAttachments,
} from '../services/attachMedia.js';

const MAX_BYTES = 20 * 1024 * 1024;

const router = Router();

function ensureDir() {
  fs.mkdirSync(ATTACHMENT_UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir();
      cb(null, ATTACHMENT_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: MAX_BYTES, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!detectAttachmentKind(file.originalname, file.mimetype)) {
      cb(new Error('Only PDF, PNG, JPEG, and PPTX files are supported'));
      return;
    }
    cb(null, true);
  },
});

function handleAttachUpload(req: AuthRequest, res: Response, next: NextFunction) {
  upload.array('files', 8)(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'Each attachment must be 20 MB or smaller.' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  });
}

/** POST /teacher/subtopic/:subtopicId/attach-media */
router.post(
  '/subtopic/:subtopicId/attach-media',
  handleAttachUpload,
  async (req: AuthRequest, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) {
      res.status(400).json({ error: 'Upload at least one PDF, PNG/JPEG, or PPTX file (field name: files)' });
      return;
    }

    try {
      const result = await ingestSubtopicAttachments({
        teacherId: req.teacherId!,
        subtopicId: String(req.params.subtopicId),
        files,
      });
      res.status(201).json({
        attachments: result.attachments,
        indexedChunkCount: result.indexedChunkCount,
        message: `Attached ${result.attachments.length} file(s) and indexed ${result.indexedChunkCount} RAG chunks.`,
      });
    } catch (err) {
      for (const file of files) fs.unlink(file.path, () => undefined);
      const status = typeof (err as { status?: number }).status === 'number' ? (err as { status: number }).status : 500;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Failed to attach media',
      });
    }
  },
);

export default router;
