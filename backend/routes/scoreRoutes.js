const express = require("express");
const { createScore, getLeaderboard } = require("../controllers/scoreController");
const { optionalAuth } = require("../middleware/optionalAuth");

const router = express.Router();

router.post("/score", optionalAuth, createScore);
router.get("/leaderboard", getLeaderboard);

module.exports = router;
