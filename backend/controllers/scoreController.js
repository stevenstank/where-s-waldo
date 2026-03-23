const prisma = require("../config/prisma");

const createScore = async (req, res) => {
  try {
    const { userId, gameId, timeTaken } = req.body;

    if (!userId || !gameId || typeof timeTaken !== "number" || !Number.isFinite(timeTaken)) {
      return res.status(400).json({ message: "userId, gameId, and numeric timeTaken are required" });
    }

    const [user, game] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.game.findUnique({ where: { id: gameId }, select: { id: true } }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    if (!game) {
      return res.status(404).json({ message: "game not found" });
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
    return res.status(500).json({ message: "failed to save score" });
  }
};

const getLeaderboard = async (req, res) => {
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
    return res.status(500).json({ message: "failed to fetch leaderboard" });
  }
};

module.exports = {
  createScore,
  getLeaderboard,
};
