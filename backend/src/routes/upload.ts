import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Ensure upload directory exists (mkdirSync with recursive:true is a no-op if already exists)
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_TO_EXT = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
  ['image/svg+xml', '.svg'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Generate a completely safe, server-controlled unique name
    const uniqueId = crypto.randomUUID();
    const mime = file.mimetype.toLowerCase();
    const ext = MIME_TO_EXT.has(mime) ? MIME_TO_EXT.get(mime) : '.bin';
    const finalFilename = `${uniqueId}${ext}`;

    // Prevent path traversal by resolving and normalizing both UPLOAD_DIR and the destination path
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    const joinedPath = path.join(resolvedUploadDir, finalFilename);
    const normalizedPath = path.normalize(joinedPath);

    if (!normalizedPath.startsWith(resolvedUploadDir)) {
      return cb(new Error('Invalid path specified!'), '');
    }

    cb(null, finalFilename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Лише зображення дозволені'));
    }
  },
});

function multerErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Файл завеликий (максимум 5 МБ)' });
      return;
    }
    res.status(400).json({ message: err.message });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ message: err.message });
    return;
  }
  next(err);
}

// POST /api/upload/image
router.post(
  '/image',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (err) => {
      if (err) return multerErrorHandler(err, req, res, next);
      next();
    });
  },
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: 'Файл не завантажено' });
      return;
    }

    // Build public URL — served by Express static middleware
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  })
);

export default router;
