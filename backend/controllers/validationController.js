const prisma = require("../config/prisma");

const validateCharacter = async (req, res) => {
  try {
    const { gameId, characterName, x, y } = req.body;

    if (!gameId || !characterName || typeof x !== "number" || typeof y !== "number") {
      return res.status(400).json({ message: "gameId, characterName, x, and y are required" });
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return res.status(400).json({ message: "x and y must be valid numbers" });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true },
    });

    if (!game) {
      return res.status(404).json({ message: "game not found" });
    }

    const character = await prisma.character.findUnique({
      where: { name: characterName },
      select: {
        x: true,
        y: true,
        tolerance: true,
      },
    });

    if (!character) {
      return res.status(200).json({ success: false });
    }

    const success =
      Math.abs(x - character.x) <= character.tolerance &&
      Math.abs(y - character.y) <= character.tolerance;

    return res.status(200).json({ success });
  } catch (error) {
    return res.status(500).json({ message: "failed to validate character" });
  }
};

module.exports = {
  validateCharacter,
};
