const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const validateCharacter = async (req, res, next) => {
  try {
    const { gameId, characterName, x, y } = req.body;

    if (!gameId || !characterName || typeof x !== "number" || typeof y !== "number") {
      throw new ApiError(400, "gameId, characterName, x, and y are required");
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new ApiError(400, "x and y must be valid numbers");
    }

    if (x < 0 || x > 100 || y < 0 || y > 100) {
      throw new ApiError(400, "x and y must be between 0 and 100");
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true },
    });

    if (!game) {
      throw new ApiError(404, "game not found");
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
    return next(error);
  }
};

module.exports = {
  validateCharacter,
};
