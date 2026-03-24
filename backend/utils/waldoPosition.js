const WALDO_NAME = "Waldo";

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const assignRandomWaldoSelectionForLevel = async ({ db, gameId, levelId }) => {
  const waldoTargets = await db.target.findMany({
    where: {
      levelId,
      name: WALDO_NAME,
    },
    select: {
      id: true,
    },
  });

  for (const waldoTarget of waldoTargets) {
    const positions = await db.targetPosition.findMany({
      where: {
        targetId: waldoTarget.id,
      },
      select: {
        id: true,
      },
    });

    if (positions.length === 0) {
      continue;
    }

    const chosen = pickRandom(positions);

    await db.gameTargetSelection.upsert({
      where: {
        gameId_targetId: {
          gameId,
          targetId: waldoTarget.id,
        },
      },
      update: {
        targetPositionId: chosen.id,
      },
      create: {
        gameId,
        targetId: waldoTarget.id,
        targetPositionId: chosen.id,
      },
    });
  }
};

const resolveTargetHitboxForGame = async ({ db, gameId, target }) => {
  if (!target || target.name !== WALDO_NAME) {
    return target;
  }

  const existingSelection = await db.gameTargetSelection.findUnique({
    where: {
      gameId_targetId: {
        gameId,
        targetId: target.id,
      },
    },
    select: {
      targetPosition: {
        select: {
          id: true,
          x: true,
          y: true,
          width: true,
          height: true,
        },
      },
    },
  });

  if (existingSelection?.targetPosition) {
    return existingSelection.targetPosition;
  }

  const positions = await db.targetPosition.findMany({
    where: {
      targetId: target.id,
    },
    select: {
      id: true,
      x: true,
      y: true,
      width: true,
      height: true,
    },
  });

  if (positions.length === 0) {
    return target;
  }

  const chosen = pickRandom(positions);

  await db.gameTargetSelection.upsert({
    where: {
      gameId_targetId: {
        gameId,
        targetId: target.id,
      },
    },
    update: {
      targetPositionId: chosen.id,
    },
    create: {
      gameId,
      targetId: target.id,
      targetPositionId: chosen.id,
    },
  });

  return chosen;
};

module.exports = {
  assignRandomWaldoSelectionForLevel,
  resolveTargetHitboxForGame,
};
