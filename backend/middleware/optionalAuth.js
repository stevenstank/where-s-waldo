const jwt = require("jsonwebtoken");

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  if (!process.env.JWT_SECRET) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload && typeof payload.userId === "string" && payload.userId.length > 0) {
      req.user = {
        userId: payload.userId,
        username: typeof payload.username === "string" ? payload.username : undefined,
      };
    }
  } catch (error) {
    // Invalid token is ignored so guest flow still works.
  }

  return next();
};

module.exports = { optionalAuth };