const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const jwt = require("jsonwebtoken");

const createScore = async (req, res, next) => {
  try {
    const { gameId, timeTaken, name } = req.body;
    const authHeader = req.headers.authorization;
    let userId = null;
    let displayName = null;

    if (!gameId || typeof gameId !== "string" || typeof timeTaken !== "number" || !Number.isFinite(timeTaken)) {
      throw new ApiError(400, "gameId and numeric timeTaken are required");
    }

    if (timeTaken < 0) {
      throw new ApiError(400, "timeTaken must be a non-negative number");
    }

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
    } else {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        throw new ApiError(400, "name is required for guest score submission");
      }

      displayName = name.trim();
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
        name: displayName,
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
        id: true,
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
      id: entry.id,
      username: entry.user?.username || entry.name || "Guest",
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
