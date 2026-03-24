const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { assignRandomWaldoSelectionForLevel } = require("../utils/waldoPosition");

const formatLevelForClient = (level, foundTargetNames) => ({
  id: level.id,
  slug: level.slug,
  name: level.name,
  orderIndex: level.orderIndex,
  targets: level.targets.map((target) => target.name),
  foundTargets: foundTargetNames,
});

const calculateGameDurationSeconds = (game) => {
  if (!game.endTime || !game.startTime) {
    return null;
  }

  return (game.endTime.getTime() - game.startTime.getTime()) / 1000;
};

const startGame = async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new ApiError(401, "invalid token user");
      }
    }

    const firstLevel = await prisma.level.findFirst({
      orderBy: {
        orderIndex: "asc",
      },
      select: {
        id: true,
        slug: true,
        name: true,
        orderIndex: true,
        targets: {
          select: {
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
    });

    if (!firstLevel) {
      return res.status(503).json({
        message: "No levels configured. Run the seed script to initialize game data.",
        code: "NO_LEVELS_CONFIGURED",
      });
    }

    const game = await prisma.$transaction(async (tx) => {
      const createdGame = await tx.game.create({
        data: {
          startTime: new Date(),
          userId,
          currentLevelOrder: firstLevel.orderIndex,
        },
      });

      await assignRandomWaldoSelectionForLevel({
        db: tx,
        gameId: createdGame.id,
        levelId: firstLevel.id,
      });

      return createdGame;
    });

    return res.status(200).json({
      gameId: game.id,
      targets: firstLevel.targets.map((target) => target.name),
      gameCompleted: false,
      currentLevel: {
        id: firstLevel.id,
        slug: firstLevel.slug,
        name: firstLevel.name,
        orderIndex: firstLevel.orderIndex,
        targets: firstLevel.targets.map((target) => target.name),
        foundTargets: [],
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getGameState = async (req, res, next) => {
  try {
    const { gameId } = req.params;

    if (!gameId || typeof gameId !== "string") {
      throw new ApiError(400, "gameId is required");
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        currentLevelOrder: true,
        completed: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!game) {
      throw new ApiError(404, "game not found");
    }

    const level = await prisma.level.findUnique({
      where: {
        orderIndex: game.currentLevelOrder,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        orderIndex: true,
        targets: {
          select: {
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
    });

    const foundInCurrentLevel = level
      ? await prisma.gameFoundTarget.findMany({
          where: {
            gameId: game.id,
            target: {
              levelId: level.id,
            },
          },
          select: {
            target: {
              select: {
                name: true,
              },
            },
          },
        })
      : [];

    const foundTargetNames = foundInCurrentLevel.map((entry) => entry.target.name);

    return res.status(200).json({
      gameId: game.id,
      gameCompleted: game.completed,
      timeTaken: calculateGameDurationSeconds(game),
      currentLevel: level ? formatLevelForClient(level, foundTargetNames) : null,
    });
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
      const existingTimeTaken = calculateGameDurationSeconds(game);
      return res.status(200).json({ timeTaken: existingTimeTaken });
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

const getGameScene = async (req, res, next) => {
  try {
    return res.status(410).json({
      message: "Scene images are no longer used. Render scenes procedurally on the client.",
      code: "SCENE_IMAGES_DISABLED",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  startGame,
  getGameState,
  finishGame,
  getGameScene,
};
