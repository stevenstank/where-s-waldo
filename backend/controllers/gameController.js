const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const startGame = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (userId && typeof userId !== "string") {
      throw new ApiError(400, "userId must be a string");
    }

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new ApiError(404, "user not found");
      }
    }

    const game = await prisma.game.create({
      data: {
        startTime: new Date(),
        userId: userId || null,
      },
      select: {
        id: true,
        userId: true,
        startTime: true,
        completed: true,
      },
    });

    return res.status(201).json(game);
  } catch (error) {
    return next(error);
  }
};

const finishGame = async (req, res, next) => {
  try {
    const { gameId } = req.body;

    if (!gameId || typeof gameId !== "string") {
      throw new ApiError(400, "gameId is required");
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        completed: true,
      },
    });

    if (!game) {
      throw new ApiError(404, "game not found");
    }

    if (game.completed) {
      throw new ApiError(400, "game already completed");
    }

    const endTime = new Date();

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        endTime,
        completed: true,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        completed: true,
      },
    });

    const timeTaken = (updatedGame.endTime.getTime() - updatedGame.startTime.getTime()) / 1000;

    return res.status(200).json({
      gameId: updatedGame.id,
      timeTaken,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  startGame,
  finishGame,
};
