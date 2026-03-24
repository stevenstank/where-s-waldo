const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  COOKIE_SECURE,
} = require("../config/env");

const issueAccessToken = ({ userId, username }) => jwt.sign(
  { userId, username, type: "access" },
  JWT_ACCESS_SECRET,
  { expiresIn: ACCESS_TOKEN_TTL },
);

const issueRefreshToken = ({ userId }) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId, jti, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL },
  );

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  return {
    token,
    jti,
    tokenHash,
    expiresAt,
  };
};

const verifyAccessToken = (token) => jwt.verify(token, JWT_ACCESS_SECRET);

const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET);

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const refreshCookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: COOKIE_SECURE ? "none" : "lax",
  path: "/api/auth",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

module.exports = {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  refreshCookieOptions,
};
