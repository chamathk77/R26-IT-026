const fs = require('fs');
const path = require('path');
const multer = require('multer');

const COST_EXPENSES_UPLOAD_SUBDIR = 'cost-expenses';
const uploadRoot = path.join(__dirname, '../../uploads');
const costExpensesDir = path.join(uploadRoot, COST_EXPENSES_UPLOAD_SUBDIR);

if (!fs.existsSync(costExpensesDir)) {
  fs.mkdirSync(costExpensesDir, { recursive: true });
}

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, costExpensesDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadCostExpenseImage = multer({
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

function uploadCostExpenseImageSingle(req, res, next) {
  uploadCostExpenseImage.single('image')(req, res, (err) => {
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
  return `/uploads/${COST_EXPENSES_UPLOAD_SUBDIR}/${filename}`;
}

function resolveCostExpenseImageDiskPath(storedUrl) {
  if (
    typeof storedUrl !== 'string' ||
    !storedUrl.startsWith(`/uploads/${COST_EXPENSES_UPLOAD_SUBDIR}/`)
  ) {
    return null;
  }
  const filename = path.basename(storedUrl);
  if (!filename || filename === '.' || filename === '..') return null;
  return path.join(costExpensesDir, filename);
}

function unlinkCostExpenseImageIfLocal(storedUrl) {
  const diskPath = resolveCostExpenseImageDiskPath(storedUrl);
  if (!diskPath) return;
  try {
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
  } catch {
    // ignore
  }
}

module.exports = {
  uploadCostExpenseImage,
  uploadCostExpenseImageSingle,
  publicImagePath,
  unlinkCostExpenseImageIfLocal,
};
