const express = require("express");
const { PORT } = require("./config/env");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require("./routes/gameRoutes");
const validationRoutes = require("./routes/validationRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const prisma = require("./config/prisma");

const app = express();

app.use(express.json());
app.get("/", (req, res) => {
  res.send("API is running...");
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
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection successful");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed", error);
    process.exit(1);
  }
};

startServer();
