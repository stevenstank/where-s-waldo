const express = require("express");
const { PORT } = require("./config/env");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const { notFoundHandler } = require("./middleware/errorHandler");
const prisma = require("./config/prisma");

const app = express();

app.use(express.json());
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use(notFoundHandler);

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
