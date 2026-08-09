const jwt = require('jsonwebtoken');

function normalizeClaim(value) {
  if (value == null || value === '') {
    return null;
  }
  return String(value).trim().toUpperCase();
}

/**
 * @param {string} id - user id
 * @param {string|number} [expiresIn='7d']
 * @param {{ shopId?: string|null, branchId?: string|null }} [claims]
 */
function generateToken(id, expiresIn = '7d', claims = {}) {
  const payload = { id: String(id) };

  const shopId = normalizeClaim(claims.shopId);
  const branchId = normalizeClaim(claims.branchId);

  if (shopId) {
    payload.shopId = shopId;
  }
  if (branchId) {
    payload.branchId = branchId;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  });
}

module.exports = generateToken;
