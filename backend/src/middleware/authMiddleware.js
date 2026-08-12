const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function validateStoredToken(userId, bearerToken) {
  const user = await User.findById(userId).select("token shopId").lean();
  // check if user exists
  if (!user) {
    return {
      valid: false,
      status: 401,
      body: {
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      },
    };
  }

  // check if token is valid
  if (!user.token || user.token !== bearerToken) {
    return {
      valid: false,
      status: 401,
      body: {
        success: false,
        message: "Session is no longer valid. Please log in again.",
        sessionEnded: true,
        code: "TOKEN_MISMATCH",
      },
    };
  }

  return { valid: true, user };
}

function createProtect() {
  return async (req, res, next) => {
    let bearerToken;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      bearerToken = req.headers.authorization.split(" ")[1];
    }
    // check if token is provided
    if (!bearerToken) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
        code: "NO_TOKEN",
      });
    }

    // decode token
    let decoded;
    // check if token is valid
    try {
      decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
    } catch (error) {
      // check if token is expired
      if (error.name === "TokenExpiredError") {
        const expiredPayload = jwt.decode(bearerToken);
        if (expiredPayload?.id) {
          await User.findByIdAndUpdate(expiredPayload.id, { token: null });
        }
        return res.status(401).json({
          success: false,
          message: "Token has expired. Please log in again.",
          tokenExpired: true,
          sessionEnded: true,
          code: "TOKEN_EXPIRED",
        });
      }
      // check if token is invalid
      return res.status(401).json({
        success: false,
        message: "Not authorized, token invalid",
        tokenInvalid: true,
        code: "TOKEN_INVALID",
      });
    }
    // check if token is valid
    const tokenCheck = await validateStoredToken(decoded.id, bearerToken);
    if (!tokenCheck.valid) {
      return res.status(tokenCheck.status).json(tokenCheck.body);
    }

    req.user = { id: decoded.id };

    if (decoded.shopId) {
      req.user.shopId = String(decoded.shopId).trim().toUpperCase();
    }
    if (decoded.branchId) {
      req.user.branchId = String(decoded.branchId).trim().toUpperCase();
    }

    try {
      const sessionUser = await User.findById(decoded.id)
        .select('shopId')
        .lean();

      if (sessionUser?.shopId) {
        req.user.shopId = String(sessionUser.shopId).trim().toUpperCase();
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

const protect = createProtect();

async function requireOwner(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("role shopId").lean();
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, user not found" });
    }
    if (user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only shop owners can create staff or admin accounts",
      });
    }
    req.user.role = user.role;
    req.user.shopId = user.shopId
      ? String(user.shopId).trim().toUpperCase()
      : "";
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  protect,
  createProtect,
  requireOwner,
  validateStoredToken,
};
