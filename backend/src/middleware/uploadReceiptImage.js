const fs = require('fs');
const path = require('path');
const multer = require('multer');

const RECEIPTS_UPLOAD_SUBDIR = 'receipts';
const uploadRoot = path.join(__dirname, '../../uploads');
const receiptsDir = path.join(uploadRoot, RECEIPTS_UPLOAD_SUBDIR);

if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, receiptsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadReceiptImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (allowedMime.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  },
});

function uploadReceiptImageSingle(req, res, next) {
  uploadReceiptImage.single('receipt')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE' ? 'Receipt image must be 5 MB or smaller' : err.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Receipt image upload failed',
    });
  });
}

function publicReceiptPath(filename) {
  return `/uploads/${RECEIPTS_UPLOAD_SUBDIR}/${filename}`;
}

function unlinkReceiptImageIfLocal(storedUrl) {
  if (typeof storedUrl !== 'string' || !storedUrl.startsWith(`/uploads/${RECEIPTS_UPLOAD_SUBDIR}/`)) {
    return;
  }
  const filename = path.basename(storedUrl);
  if (!filename || filename === '.' || filename === '..') return;
  const diskPath = path.join(receiptsDir, filename);
  try {
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
  } catch {
    // ignore
  }
}

module.exports = {
  uploadReceiptImageSingle,
  publicReceiptPath,
  unlinkReceiptImageIfLocal,
};
