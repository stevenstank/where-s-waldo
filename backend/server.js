const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const crypto = require("crypto");
const {
  PORT,
  DATABASE_URL,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
} = require("./config/env");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require("./routes/gameRoutes");
const validationRoutes = require("./routes/validationRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const prisma = require("./config/prisma");

const app = express();
const HOST = "0.0.0.0";

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://where-s-waldo-roan.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});
app.use(morgan(":method :url :status :response-time ms req-id=:req[x-request-id]"));
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});
app.use("/api", healthRoutes);
app.use("/api", validationRoutes);
app.use("/api", scoreRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured");
    }

    if (!JWT_ACCESS_SECRET) {
      throw new Error("JWT_ACCESS_SECRET is not configured");
    }

    if (!JWT_REFRESH_SECRET) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }

    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection successful");

    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed", error);
    process.exit(1);
  }
};

startServer();
