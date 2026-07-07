const fs = require('fs');
const path = require('path');

const uploadsRoot = path.join(__dirname, '../../uploads');

function resolveLocalUploadDiskPath(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') {
    return null;
  }

  if (/^https?:\/\//i.test(storedPath)) {
    return null;
  }

  const normalized = storedPath.startsWith('/') ? storedPath : `/${storedPath}`;
  if (!normalized.startsWith('/uploads/')) {
    return null;
  }

  const relativePath = normalized.replace(/^\/uploads\//, '');
  if (!relativePath || relativePath.includes('..')) {
    return null;
  }

  return path.join(uploadsRoot, relativePath);
}

function isLocalUploadAvailable(storedPath) {
  const diskPath = resolveLocalUploadDiskPath(storedPath);
  if (!diskPath) {
    return false;
  }

  try {
    return fs.existsSync(diskPath);
  } catch {
    return false;
  }
}

module.exports = {
  uploadsRoot,
  resolveLocalUploadDiskPath,
  isLocalUploadAvailable,
};
