const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { createGuestName } = require("../utils/identity");

const createScore = async (req, res, next) => {
  try {
    const { gameId } = req.body;
    const userId = req.user?.userId || null;
    let displayName = null;

    if (!gameId || typeof gameId !== "string") {
      throw new ApiError(400, "gameId is required");
    }

    if (!userId) {
      displayName = createGuestName(gameId);
    }

    const [user, game, existingScore] = await Promise.all([
      userId
        ? prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } })
        : Promise.resolve(null),
      prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          userId: true,
          completed: true,
          startTime: true,
          endTime: true,
        },
      }),
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

    if (!game.endTime) {
      throw new ApiError(400, "game completion timestamp is missing");
    }

    if (userId && game.userId !== userId) {
      throw new ApiError(403, "cannot submit score for another player's game");
    }

    if (!userId && game.userId) {
      throw new ApiError(403, "authenticated game score requires the game owner");
    }

    if (existingScore) {
      throw new ApiError(409, "score for this game has already been submitted");
    }

    const timeTaken = (game.endTime.getTime() - game.startTime.getTime()) / 1000;

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
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize || "10", 10) || 10));
    const skip = (page - 1) * pageSize;

    const [total, leaderboard] = await Promise.all([
      prisma.score.count(),
      prisma.score.findMany({
      orderBy: [
        {
          timeTaken: "asc",
        },
        {
          game: {
            endTime: "asc",
          },
        },
      ],
      skip,
      take: pageSize,
      select: {
        id: true,
        timeTaken: true,
        name: true,
        user: {
          select: {
            username: true,
          },
        },
        game: {
          select: {
            endTime: true,
          },
        },
      },
      }),
    ]);

    const formatted = leaderboard.map((entry, index) => ({
      id: entry.id,
      rank: skip + index + 1,
      name: entry.user?.username || entry.name || "Guest",
      timeTaken: entry.timeTaken,
      isGuest: !entry.user,
      completedAt: entry.game?.endTime,
    }));

    return res.status(200).json({
      rows: formatted,
      page,
      pageSize,
      total,
      hasNextPage: skip + formatted.length < total,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createScore,
  getLeaderboard,
};
