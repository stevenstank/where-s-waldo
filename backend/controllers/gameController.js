const prisma = require("../config/prisma");

const startGame = async (req, res) => {
  try {
    const { userId } = req.body;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ message: "user not found" });
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
    return res.status(500).json({ message: "failed to start game" });
  }
};

const finishGame = async (req, res) => {
  try {
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({ message: "gameId is required" });
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
      return res.status(404).json({ message: "game not found" });
    }

    if (game.completed) {
      return res.status(400).json({ message: "game already completed" });
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
    return res.status(500).json({ message: "failed to finish game" });
  }
};

module.exports = {
  startGame,
  finishGame,
};
