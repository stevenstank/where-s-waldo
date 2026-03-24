const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const clickTrack = new Map();
const CLICK_WINDOW_MS = 4000;
const MAX_CLICKS_PER_WINDOW = 18;
const MAX_REPEAT_POINTS = 3;

const registerClick = ({ gameId, x, y }) => {
  const now = Date.now();
  const state = clickTrack.get(gameId) || {
    clicks: [],
    repeatedPointHits: 0,
  };

  const recentClicks = state.clicks.filter((entry) => now - entry.at <= CLICK_WINDOW_MS);
  const wasRepeatedPoint = recentClicks.some((entry) => entry.x === x && entry.y === y);

  if (wasRepeatedPoint) {
    state.repeatedPointHits += 1;
  }

  recentClicks.push({ at: now, x, y });
  state.clicks = recentClicks;
  clickTrack.set(gameId, state);

  return {
    clickCount: recentClicks.length,
    repeatedPointHits: state.repeatedPointHits,
  };
};

const isInsideBox = (x, y, box, padding = 0) => {
  const left = box.x - padding;
  const right = box.x + box.width + padding;
  const top = box.y - padding;
  const bottom = box.y + box.height + padding;

  return x >= left && x <= right && y >= top && y <= bottom;
};

const validateCharacter = async (req, res, next) => {
  try {
    const { gameId, targetName, x, y } = req.body;

    if (!gameId || typeof targetName !== "string" || typeof x !== "number" || typeof y !== "number") {
      throw new ApiError(400, "gameId, targetName, x, and y are required");
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new ApiError(400, "x and y must be valid numbers");
    }

    const clickMeta = registerClick({
      gameId,
      x,
      y,
    });

    if (clickMeta.clickCount > MAX_CLICKS_PER_WINDOW || clickMeta.repeatedPointHits > MAX_REPEAT_POINTS) {
      throw new ApiError(429, "Too many rapid attempts detected. Slow down.");
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        currentLevelOrder: true,
        completed: true,
      },
    });

    if (!game) {
      throw new ApiError(404, "game not found");
    }

    if (game.completed) {
      return res.status(200).json({
        success: false,
        gameCompleted: true,
      });
    }

    const level = await prisma.level.findUnique({
      where: {
        orderIndex: game.currentLevelOrder,
      },
      include: {
        targets: {
          select: {
            id: true,
            name: true,
            x: true,
            y: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!level) {
      throw new ApiError(404, "level not found");
    }

    if (x < 0 || x > level.imageWidth || y < 0 || y > level.imageHeight) {
      throw new ApiError(400, "click must be inside image bounds");
    }

    const selectedTarget = level.targets.find((target) => target.name === targetName);

    if (!selectedTarget) {
      throw new ApiError(404, "target not found in current level");
    }

    const existingFoundRecord = await prisma.gameFoundTarget.findUnique({
      where: {
        gameId_targetId: {
          gameId: game.id,
          targetId: selectedTarget.id,
        },
      },
      select: {
        id: true,
      },
    });

    const adaptivePadding = Math.max(6, Math.round(Math.min(selectedTarget.width, selectedTarget.height) * 0.06));
    const success = isInsideBox(x, y, selectedTarget, adaptivePadding);

    if (!success) {
      return res.status(200).json({
        success: false,
        gameCompleted: false,
        levelCompleted: false,
      });
    }

    if (!existingFoundRecord) {
      await prisma.gameFoundTarget.create({
        data: {
          gameId: game.id,
          targetId: selectedTarget.id,
        },
      });
    }

    const foundInLevel = await prisma.gameFoundTarget.findMany({
      where: {
        gameId: game.id,
        target: {
          levelId: level.id,
        },
      },
      select: {
        target: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const foundTargetNames = foundInLevel.map((entry) => entry.target.name);
    const levelCompleted = foundTargetNames.length >= level.targets.length;

    if (!levelCompleted) {
      return res.status(200).json({
        success: true,
        gameCompleted: false,
        levelCompleted: false,
        foundTargets: foundTargetNames,
      });
    }

    const nextLevel = await prisma.level.findFirst({
      where: {
        orderIndex: {
          gt: game.currentLevelOrder,
        },
      },
      orderBy: {
        orderIndex: "asc",
      },
      include: {
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

    if (!nextLevel) {
      const completedGame = await prisma.game.update({
        where: { id: game.id },
        data: {
          completed: true,
          endTime: new Date(),
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      const timeTaken = (completedGame.endTime.getTime() - completedGame.startTime.getTime()) / 1000;
      clickTrack.delete(game.id);

      return res.status(200).json({
        success: true,
        gameCompleted: true,
        levelCompleted: true,
        foundTargets: foundTargetNames,
        timeTaken,
      });
    }

    await prisma.game.update({
      where: { id: game.id },
      data: {
        currentLevelOrder: nextLevel.orderIndex,
      },
    });

    return res.status(200).json({
      success: true,
      gameCompleted: false,
      levelCompleted: true,
      foundTargets: foundTargetNames,
      nextLevel: {
        id: nextLevel.id,
        slug: nextLevel.slug,
        name: nextLevel.name,
        orderIndex: nextLevel.orderIndex,
        image: {
          url: nextLevel.imageUrl,
          width: nextLevel.imageWidth,
          height: nextLevel.imageHeight,
        },
        targets: nextLevel.targets.map((target) => target.name),
        foundTargets: [],
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validateCharacter,
};
