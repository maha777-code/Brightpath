import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { hasFeatureAccess } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireRoles, type AuthRequest } from '../middleware/auth.js';
import { toOrganization } from '../lib/platformSerializers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAND_DIR = path.resolve(__dirname, '../../uploads/branding');

const router = Router();
router.use(requireRoles('org_admin', 'center_admin'));

function ensureBrandDir() {
  fs.mkdirSync(BRAND_DIR, { recursive: true });
}

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureBrandDir();
      cb(null, BRAND_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${Date.now()}-${(Math.random() * 1e9) | 0}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      /image\/(png|jpeg|jpg|svg\+xml|webp)/.test(file.mimetype) ||
      /\.(png|jpe?g|svg|webp)$/i.test(file.originalname);
    if (!ok) {
      cb(new Error('Logo must be PNG, JPG, SVG, or WebP'));
      return;
    }
    cb(null, true);
  },
});

router.get('/branding', async (req: AuthRequest, res) => {
  if (!req.organizationId) {
    res.status(404).json({ error: 'No organization' });
    return;
  }
  const org = await prisma.organization.findUnique({ where: { id: req.organizationId } });
  if (!org) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ organization: toOrganization(org) });
});

router.patch('/branding', async (req: AuthRequest, res) => {
  try {
    if (!hasFeatureAccess(req.planType, 'custom_branding')) {
      res.status(402).json({ error: 'Custom branding requires School Enterprise or Center Pro.' });
      return;
    }
    if (!req.organizationId) {
      res.status(400).json({ error: 'Organization required' });
      return;
    }
    const schema = z.object({
      name: z.string().min(2).optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      primaryHoverColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const org = await prisma.organization.update({
      where: { id: req.organizationId },
      data: parsed.data,
    });
    res.json({ organization: toOrganization(org) });
  } catch (err) {
    console.error('Branding update failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

router.post('/branding/logo', (req: AuthRequest, res, next) => {
  if (!hasFeatureAccess(req.planType, 'custom_branding')) {
    res.status(402).json({ error: 'Custom branding requires School Enterprise or Center Pro.' });
    return;
  }
  logoUpload.single('logo')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
      return;
    }
    next();
  });
}, async (req: AuthRequest, res) => {
  try {
    if (!req.organizationId || !req.file) {
      res.status(400).json({ error: 'Logo file required' });
      return;
    }
    const logoUrl = `/uploads/branding/${req.file.filename}`;
    const org = await prisma.organization.update({
      where: { id: req.organizationId },
      data: { logoUrl },
    });
    res.json({ organization: toOrganization(org), logoUrl });
  } catch (err) {
    console.error('Logo upload failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Upload failed' });
  }
});

export default router;
