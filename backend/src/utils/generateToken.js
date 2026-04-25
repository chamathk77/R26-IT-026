const jwt = require('jsonwebtoken');

function generateToken(id) {


  const token = jwt.sign({ id: String(id) }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  console.log('Token generated:', token);
  return token;
}

module.exports = generateToken;
