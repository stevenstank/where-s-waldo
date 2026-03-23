const express = require("express");
const { PORT } = require("./config/env");
const healthRoutes = require("./routes/healthRoutes");
const { notFoundHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use("/api", healthRoutes);
app.use(notFoundHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
