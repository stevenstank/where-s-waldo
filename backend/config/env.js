const dotenv = require("dotenv");

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const DATABASE_URL = process.env.DATABASE_URL || "";
const JWT_SECRET = process.env.JWT_SECRET || "";

module.exports = {
  PORT,
  DATABASE_URL,
  JWT_SECRET,
};
