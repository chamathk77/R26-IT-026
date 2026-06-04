const jwt = require('jsonwebtoken');

function generateToken(id, expiresIn = '7d') {
  const token = jwt.sign({ id: String(id) }, process.env.JWT_SECRET, {
    expiresIn,
  });
  return token;
}

module.exports = generateToken;
