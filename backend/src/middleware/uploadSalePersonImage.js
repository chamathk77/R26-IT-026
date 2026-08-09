const fs = require('fs');
const path = require('path');
const multer = require('multer');

const SALE_PERSONS_UPLOAD_SUBDIR = 'sale-persons';
const uploadRoot = path.join(__dirname, '../../uploads');
const salePersonsDir = path.join(uploadRoot, SALE_PERSONS_UPLOAD_SUBDIR);

if (!fs.existsSync(salePersonsDir)) {
  fs.mkdirSync(salePersonsDir, { recursive: true });
}

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, salePersonsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadSalePersonImage = multer({
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

function uploadSalePersonImageSingle(req, res, next) {
  uploadSalePersonImage.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : err.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Image upload failed',
    });
  });
}

function publicImagePath(filename) {
  return `/uploads/${SALE_PERSONS_UPLOAD_SUBDIR}/${filename}`;
}

function resolveSalePersonImageDiskPath(storedUrl) {
  if (
    typeof storedUrl !== 'string' ||
    !storedUrl.startsWith(`/uploads/${SALE_PERSONS_UPLOAD_SUBDIR}/`)
  ) {
    return null;
  }
  const filename = path.basename(storedUrl);
  if (!filename || filename === '.' || filename === '..') return null;
  return path.join(salePersonsDir, filename);
}

function unlinkSalePersonImageIfLocal(storedUrl) {
  const diskPath = resolveSalePersonImageDiskPath(storedUrl);
  if (!diskPath) return;
  try {
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
  } catch {
    // ignore
  }
}

module.exports = {
  uploadSalePersonImage,
  uploadSalePersonImageSingle,
  publicImagePath,
  unlinkSalePersonImageIfLocal,
};
