const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const createScore = async (req, res, next) => {
  try {
    const { userId, gameId, timeTaken } = req.body;

    if (!userId || !gameId || typeof timeTaken !== "number" || !Number.isFinite(timeTaken)) {
      throw new ApiError(400, "userId, gameId, and numeric timeTaken are required");
    }

    if (timeTaken < 0) {
      throw new ApiError(400, "timeTaken must be a non-negative number");
    }

    const [user, game, existingScore] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.game.findUnique({ where: { id: gameId }, select: { id: true } }),
      prisma.score.findFirst({ where: { gameId } }),
    ]);

    if (!user) {
      throw new ApiError(404, "user not found");
    }

    if (!game) {
      throw new ApiError(404, "game not found");
    }

    if (existingScore) {
      throw new ApiError(409, "score for this game has already been submitted");
    }

    const score = await prisma.score.create({
      data: {
        userId,
        gameId,
        timeTaken,
      },
      select: {
        id: true,
        userId: true,
        gameId: true,
        timeTaken: true,
      },
    });

    return res.status(201).json(score);
  } catch (error) {
    return next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await prisma.score.findMany({
      orderBy: {
        timeTaken: "asc",
      },
      take: 10,
      select: {
        id: true,
        timeTaken: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    const formatted = leaderboard.map((entry) => ({
      id: entry.id,
      username: entry.user.username,
      timeTaken: entry.timeTaken,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createScore,
  getLeaderboard,
};
