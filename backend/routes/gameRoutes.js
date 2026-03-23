const express = require("express");
const { startGame, finishGame } = require("../controllers/gameController");

const router = express.Router();

router.post("/start", startGame);
router.post("/finish", finishGame);

module.exports = router;
