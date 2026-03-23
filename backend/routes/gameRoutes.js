const express = require("express");
const { startGame, finishGame } = require("../controllers/gameController");
const { optionalAuth } = require("../middleware/optionalAuth");

const router = express.Router();

router.post("/start", optionalAuth, startGame);
router.post("/finish", finishGame);

module.exports = router;
