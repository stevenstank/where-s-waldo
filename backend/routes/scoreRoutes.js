const express = require("express");
const { createScore, getLeaderboard } = require("../controllers/scoreController");
const { authenticateToken } = require("../middleware/authenticateToken");
const { optionalAuth } = require("../middleware/optionalAuth");

const router = express.Router();

router.post("/score", optionalAuth, createScore);
router.get("/leaderboard", authenticateToken, getLeaderboard);

module.exports = router;
