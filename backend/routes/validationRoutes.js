const express = require("express");
const { validateCharacter } = require("../controllers/validationController");

const router = express.Router();

router.post("/validate", validateCharacter);

module.exports = router;
