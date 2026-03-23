const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const validateCharacter = async (req, res, next) => {
  try {
    const { gameId, x, y } = req.body;

    if (!gameId || typeof x !== "number" || typeof y !== "number") {
      throw new ApiError(400, "gameId, x, and y are required");
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new ApiError(400, "x and y must be valid numbers");
    }

    if (x < 0 || x > 100 || y < 0 || y > 100) {
      throw new ApiError(400, "x and y must be between 0 and 100");
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        waldoX: true,
        waldoY: true,
        waldoTolerance: true,
      },
    });

    if (!game) {
      throw new ApiError(404, "game not found");
    }

    const dx = x - game.waldoX;
    const dy = y - game.waldoY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const success = distance <= game.waldoTolerance;

    return res.status(200).json({ success });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validateCharacter,
};
