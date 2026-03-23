const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT secret is not configured" });
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload || typeof payload.userId !== "string" || payload.userId.length === 0) {
      return res.status(403).json({ message: "invalid token payload" });
    }

    req.user = {
      userId: payload.userId,
      username: typeof payload.username === "string" ? payload.username : undefined,
    };
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "token expired" });
    }

    return res.status(403).json({ message: "invalid token" });
  }
};

module.exports = { authenticateToken };
