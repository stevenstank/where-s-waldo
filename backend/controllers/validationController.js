const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const {
  WALDO_RENDER_WIDTH,
  WALDO_RENDER_HEIGHT,
} = require("../constants/waldo");

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
    const { gameId, positionId, x, y } = req.body;

    if (!gameId || !positionId || typeof x !== "number" || typeof y !== "number") {
      throw new ApiError(400, "gameId, positionId, x, and y are required");
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

    if (x < 0 || y < 0) {
      throw new ApiError(400, "click coordinates must be positive");
    }

    const selectedPosition = await prisma.gameTargetSelection.findFirst({
      where: {
        gameId: game.id,
        targetPositionId: positionId,
      },
      select: {
        targetId: true,
        targetPosition: {
          select: {
            id: true,
            x: true,
            y: true,
          },
        },
      },
    });

    if (!selectedPosition?.targetPosition) {
      throw new ApiError(404, "position not found for this game session");
    }

    const targetHitbox = {
      x: selectedPosition.targetPosition.x,
      y: selectedPosition.targetPosition.y,
      width: WALDO_RENDER_WIDTH,
      height: WALDO_RENDER_HEIGHT,
    };

    const success = isInsideBox(x, y, targetHitbox, 0);

    if (!success) {
      return res.status(200).json({
        success: false,
        gameCompleted: false,
        foundTargets: [],
      });
    }

    await prisma.gameFoundTarget.upsert({
      where: {
        gameId_targetId: {
          gameId: game.id,
          targetId: selectedPosition.targetId,
        },
      },
      update: {},
      create: {
        gameId: game.id,
        targetId: selectedPosition.targetId,
      },
    });

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
      foundTargets: ["Waldo"],
      timeTaken,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validateCharacter,
};
