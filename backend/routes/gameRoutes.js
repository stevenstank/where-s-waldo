const express = require("express");
const { startGame, finishGame, getGameScene } = require("../controllers/gameController");
const { optionalAuth } = require("../middleware/optionalAuth");

const router = express.Router();

router.post("/start", optionalAuth, startGame);
router.post("/finish", finishGame);
router.get("/:gameId/scene.svg", getGameScene);

module.exports = router;
