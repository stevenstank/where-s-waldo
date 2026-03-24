const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const scoreOrdering = [
  {
    timeTaken: "asc",
  },
  {
    game: {
      endTime: "asc",
    },
  },
  {
    createdAt: "asc",
  },
];

const createScore = async (req, res, next) => {
  try {
    const { gameId } = req.body;
    const userId = req.user?.userId || null;

    if (!gameId || typeof gameId !== "string") {
      throw new ApiError(400, "gameId is required");
    }

    const [user, game] = await Promise.all([
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
    ]);

    if (userId && !user) {
      throw new ApiError(404, "user not found");
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

    if (!userId) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: "guest scores are not stored",
      });
    }

    const timeTaken = (game.endTime.getTime() - game.startTime.getTime()) / 1000;

    const score = await prisma.$transaction(async (tx) => {
      const existingScores = await tx.score.findMany({
        where: { userId },
        orderBy: scoreOrdering,
        select: {
          id: true,
          userId: true,
          name: true,
          gameId: true,
          timeTaken: true,
        },
      });

      if (existingScores.length === 0) {
        return tx.score.create({
          data: {
            userId,
            name: null,
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
      }

      const [bestExistingScore, ...duplicateScores] = existingScores;
      const shouldReplaceBest = timeTaken < bestExistingScore.timeTaken;

      const keptScore = await tx.score.update({
        where: { id: bestExistingScore.id },
        data: shouldReplaceBest
          ? {
              gameId,
              timeTaken,
              name: null,
            }
          : {
              name: null,
            },
        select: {
          id: true,
          userId: true,
          name: true,
          gameId: true,
          timeTaken: true,
        },
      });

      if (duplicateScores.length > 0) {
        await tx.score.deleteMany({
          where: {
            id: {
              in: duplicateScores.map((entry) => entry.id),
            },
          },
        });
      }

      return keptScore;
    });

    return res.status(200).json({
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

    const scores = await prisma.score.findMany({
      where: {
        userId: {
          not: null,
        },
      },
      orderBy: scoreOrdering,
      select: {
        id: true,
        userId: true,
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
    });

    const leaderboard = [];
    const seenUserIds = new Set();

    for (const entry of scores) {
      if (!entry.userId || seenUserIds.has(entry.userId)) {
        continue;
      }

      seenUserIds.add(entry.userId);
      leaderboard.push(entry);
    }

    const total = leaderboard.length;
    const pagedLeaderboard = leaderboard.slice(skip, skip + pageSize);

    const formatted = pagedLeaderboard.map((entry, index) => ({
      id: entry.id,
      rank: skip + index + 1,
      name: entry.user?.username || entry.name || "Unknown",
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
