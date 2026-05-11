const fs = require('fs');
const path = require('path');
const multer = require('multer');

const PRODUCTS_UPLOAD_SUBDIR = 'products';
const uploadRoot = path.join(__dirname, '../../uploads');
const productsDir = path.join(uploadRoot, PRODUCTS_UPLOAD_SUBDIR);

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, productsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadProductImage = multer({
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

/** Multer middleware: field name `image` (optional). JSON-only requests still work. */
function uploadProductImageSingle(req, res, next) {
  uploadProductImage.single('image')(req, res, (err) => {
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

/** Public URL path stored on Product.image (served by express.static). */
function publicImagePath(filename) {
  return `/uploads/${PRODUCTS_UPLOAD_SUBDIR}/${filename}`;
}

function resolveProductImageDiskPath(storedUrl) {
  if (typeof storedUrl !== 'string' || !storedUrl.startsWith(`/uploads/${PRODUCTS_UPLOAD_SUBDIR}/`)) {
    return null;
  }
  const filename = path.basename(storedUrl);
  if (!filename || filename === '.' || filename === '..') return null;
  return path.join(productsDir, filename);
}

function unlinkProductImageIfLocal(storedUrl) {
  const diskPath = resolveProductImageDiskPath(storedUrl);
  if (!diskPath) return;
  try {
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
  } catch {
    // ignore
  }
}

module.exports = {
  uploadProductImage,
  uploadProductImageSingle,
  publicImagePath,
  unlinkProductImageIfLocal,
};
