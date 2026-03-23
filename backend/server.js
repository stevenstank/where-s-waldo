const express = require("express");
const cors = require("cors");
const { PORT, DATABASE_URL, JWT_SECRET } = require("./config/env");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require("./routes/gameRoutes");
const validationRoutes = require("./routes/validationRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const prisma = require("./config/prisma");

const app = express();
const HOST = "0.0.0.0";

app.use(cors());
app.use(express.json());
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

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
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
