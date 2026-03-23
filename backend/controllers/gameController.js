const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const jwt = require("jsonwebtoken");

const startGame = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader) {
      if (!process.env.JWT_SECRET) {
        throw new ApiError(500, "JWT secret is not configured");
      }

      if (!authHeader.startsWith("Bearer ")) {
        throw new ApiError(401, "invalid authorization header");
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        throw new ApiError(401, "missing token");
      }

      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        throw new ApiError(401, "invalid token");
      }

      userId = payload.userId;

      if (!userId || typeof userId !== "string") {
        throw new ApiError(401, "invalid token payload");
      }
    }

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new ApiError(401, "invalid token user");
      }
    }

    const game = await prisma.game.create({
      data: {
        startTime: new Date(),
        userId,
      },
    });

    return res.status(201).json({ gameId: game.id });
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

    return res.status(200).json({ timeTaken });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  startGame,
  finishGame,
};
