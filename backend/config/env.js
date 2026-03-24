const dotenv = require("dotenv");

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const DATABASE_URL = process.env.DATABASE_URL || "";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || "http://localhost:5173";
const NODE_ENV = process.env.NODE_ENV || "development";
const COOKIE_SECURE = NODE_ENV === "production";

module.exports = {
  PORT,
  DATABASE_URL,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  CLIENT_ORIGIN,
  NODE_ENV,
  COOKIE_SECURE,
};
