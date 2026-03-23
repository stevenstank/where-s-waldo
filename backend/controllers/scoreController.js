const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { createGuestName } = require("../utils/identity");

const createScore = async (req, res, next) => {
  try {
    const { gameId, timeTaken } = req.body;
    const userId = req.user?.userId || null;
    let displayName = null;

    if (!gameId || typeof gameId !== "string" || typeof timeTaken !== "number" || !Number.isFinite(timeTaken)) {
      throw new ApiError(400, "gameId and numeric timeTaken are required");
    }

    if (timeTaken < 0) {
      throw new ApiError(400, "timeTaken must be a non-negative number");
    }

    if (!userId) {
      displayName = createGuestName(gameId);
    }

    const [user, game, existingScore] = await Promise.all([
      userId
        ? prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } })
        : Promise.resolve(null),
      prisma.game.findUnique({ where: { id: gameId }, select: { id: true, completed: true } }),
      prisma.score.findFirst({ where: { gameId } }),
    ]);

    if (userId && !user) {
      throw new ApiError(404, "user not found");
    }

    if (user) {
      displayName = user.username;
    }

    if (!game) {
      throw new ApiError(404, "game not found");
    }

    if (!game.completed) {
      throw new ApiError(400, "game must be completed before submitting score");
    }

    if (existingScore) {
      throw new ApiError(409, "score for this game has already been submitted");
    }

    const score = await prisma.score.create({
      data: {
        userId,
        name: userId ? null : displayName,
        gameId,
        timeTaken,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        gameId: true,
        timeTaken: true,
      },
    });

    return res.status(201).json({
      success: true,
      score,
    });
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
        timeTaken: true,
        name: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    const formatted = leaderboard.map((entry) => ({
      name: entry.user?.username || entry.name || "Guest",
      timeTaken: entry.timeTaken,
      isGuest: !entry.user,
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
