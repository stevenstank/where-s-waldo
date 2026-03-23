const express = require("express");
const { createScore, getLeaderboard } = require("../controllers/scoreController");

const router = express.Router();

router.post("/score", createScore);
router.get("/leaderboard", getLeaderboard);

module.exports = router;
